// TODO This code is piece of shit
//  I NEED TO REFACTOR THIS
let browserAPI;
// Check browser
if (navigator.userAgent.indexOf('Chrome') !== -1) {
    console.log("[BroccoliFlix] Chrome");
    browserAPI = chrome;
} else if (navigator.userAgent.indexOf('Firefox') !== -1){
    console.log("[BroccoliFlix] Firefox");
    browserAPI = browser;
} else {
    console.log("[BroccoliFlix] ! BROWSER IS NOT RECOGNIZED !")
}

class WebSocketClient {
    socket = null;
    currentTimeoutId = null;

    constructor(address) {
        this.address = address;
    }

    connectWebSocket() {
        browserAPI.runtime.sendMessage({ action: 'status', textContent: 'reconnecting'});
        this.socket = new WebSocket(this.address);
        this.addListeners();
    }

    addListeners() {
        //opening and closing
        this.socket.onopen = () => {
            console.log('[BroccoliFlix] Connected');
            browserAPI.runtime.sendMessage({ action: 'status', textContent: 'connected'});
        }

        this.socket.onclose = () => {
            console.log('[BroccoliFlix] Connection closed!');

            var mh = this.socket.onmessage;
            this.socket.close();
            this.currentTimeoutId = setTimeout(() => {
                this.connectWebSocket();
            }, 5000);
        };
        this.socket.onmessage = this.messageHandler;
    }

    addMessageHandler(messageHandler) {
        this.messageHandler = messageHandler;
        this.socket.addEventListener('message', this.messageHandler);
    }

    send(message) {
        this.socket.send(message);
    }

    stop() {
        this.socket.onclose = null;
        if (this.currentTimeoutId != null) {
            clearTimeout(this.currentTimeoutId)
            this.currentTimeoutId = null;
        }
        this.socket.close();
        browserAPI.runtime.sendMessage({ action: 'status', textContent: 'stop'});
    }

    getStatus() {
        if (this.socket != null && this.socket.readyState === WebSocket.OPEN) {
            return 'connected';
        } else { 
            if (this.currentTimeoutId != null) 
                return 'reconnecting';
            else 
                return 'stopped';
        }
    }
}

class VideoPlayerClient {
    playHandlerEnabled = true;

    constructor(socketAddress) {
        this.client = new WebSocketClient(socketAddress);
        this.messageHandler = (event) => {
            const command = event.data.split(':');

            switch (command[0]) {
                case 'play':
                    console.log('[BroccoliFlix] Received: PLAY');
                    this.playVideoByServer();
                    break;
                case 'pause':
                    console.log('[BroccoliFlix] Received: PAUSE');
                    this.stopVideoByServer();
                    break;
                case 'changetime':
                    console.log('[BroccoliFlix] Received: TIME SYNC');
                    this.videoElement.currentTime = command[1];
                    break;
                case 'status':
                    console.log(`[BroccoliFlix] Received: STATUS:\n${command[1]}`);
                    break;
            }
        }
    }

    start() {
        this.client.connectWebSocket();
        this.setElements();
    }

    stop() {
        this.client.stop();
    }

    getStatus() {
        return this.client.getStatus();
    }

    setElements() {
        browserAPI.storage.local.get("videoSelector", (result) => {
            browserAPI.storage.local.get("bufferRingSelector", (result2) => {
                browserAPI.storage.local.get("timelineSelector", (result3) => {
                    this.videoElement = document.querySelector(result["videoSelector"]);
                    this.bufferSpinnerElement = document.querySelector(result2["bufferRingSelector"]);
                    this.timelineElement = document.querySelector(result3["timelineSelector"]);
                    console.log("[BroccoliFlix]\nvideoElement: " + this.videoElement +
                        "\nbufferSpinnerElement: " + this.bufferSpinnerElement +
                        "\ntimelineElement: "+ this.timelineElement);
                    this.addListeners();
                    this.client.addMessageHandler(this.messageHandler);
                });
            });
        });
    }

    addListeners() {
        //setup listeners for manual play/pause/change_time commands
        this.videoElement.onplay = () => {
            if (this.playHandlerEnabled) {
                this.client.send(`ready:${this.videoElement.currentTime}`);
                this.client.send(`play:${this.videoElement.currentTime}`);
            }
        };

        this.videoElement.onpause = () => {
            if (this.playHandlerEnabled) {
                this.client.send(`pause:${this.videoElement.currentTime}`);
            }
        };

        this.timelineElement.onclick = () => {
            this.client.send(`changetime:${this.videoElement.currentTime}`);
        };

        // Buffering handling
        // 1. Check if video is buffering
        let lastBufferSpinnerValue = this.bufferSpinnerElement.style.display;

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'style' && this.bufferSpinnerElement.style.display !== lastBufferSpinnerValue) {
                    lastBufferSpinnerValue = this.bufferSpinnerElement.style.display;
                    if (lastBufferSpinnerValue !== 'none') {
                        this.client.send(`notready:${this.videoElement.currentTime}`);
                    }
                }
            });
        });

        observer.observe(this.bufferSpinnerElement, {attributes: true});

        // 2. Notify server when video is ready to play
        this.videoElement.oncanplay = () => {
            //this.stopVideoByServer()
            this.client.send(`ready:${this.videoElement.currentTime}`);
        };
    }

    // Play and pause video by server.
    // (we should avoid to transmit it back)
    // Needs to fix it
    // Play video by server command
    playVideoByServer() {
        this.playHandlerEnabled = false;
        this.videoElement.play()
            .then(() => {
                setTimeout(() => {
                    this.playHandlerEnabled = true;
                }, 100);
            }).catch(error => {
            this.playHandlerEnabled = true;
            console.error("[BroccoliFlix] Error playing video:", error)
        });
    }

// Stop video by server command
    stopVideoByServer() {
        this.playHandlerEnabled = false;
        this.videoElement.pause();
        setTimeout(() => {
            this.playHandlerEnabled = true;
        }, 100);
    }
}

let providedAddress = "wss://broccoliflix.space";
//let providedAddress = "ws://localhost:3000";
providedAddress += (window.location.pathname + window.location.search);

let videoClient = new VideoPlayerClient(providedAddress);

browserAPI.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'start') {
    videoClient.start();
    sendResponse({ success: true });
  } else if (message.action === 'stop') {
    videoClient.stop();
    sendResponse({ success: true });
  } else if (message.action === 'status') {
    sendResponse({ action: 'status', textContent: videoClient.getStatus()})
  } else if (message.action === 'elements_load') {
      videoClient.setElements();
      sendResponse({ success: true });
  }
});

console.log('[BroccoliFlix] BroccoliFlix is ready!')