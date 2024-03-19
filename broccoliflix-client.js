class WebSocketClient {
    socket = null;
    currentTimeoutId = null;

    constructor(address) {
        this.address = address;
    }

    connectWebSocket() {
        this.socket = new WebSocket(this.address);
        this.addListeners();
    }

    addListeners() {
        //opening and closing
        this.socket.addEventListener('open', () => {
            console.log('[BroccoliFlix] Connected');
        });
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
    }
}

class VideoPlayerClient {
    playHandlerEnabled = true;

    constructor(socketAddress, videoElement, bufferSpinnerElement, timelineElement) {
        this.videoElement = videoElement;
        this.bufferSpinnerElement = bufferSpinnerElement;
        this.timelineElement = timelineElement;
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
        this.addListeners();
        this.client.addMessageHandler(this.messageHandler);
    }

    stop() {
        this.client.stop();
    }

    addListeners() {
        //setup listeners for manual play/pause/change_time commands
        this.videoElement.onplay = () => {
            //console.log(`[BroccoliFlix] onplay: ${this.playHandlerEnabled}`);
            if (this.playHandlerEnabled) {
            this.client.send(`ready:${this.videoElement.currentTime}`);

                console.log(`[BroccoliFlix] sendplay`);
                this.client.send(`play:${this.videoElement.currentTime}`);
            }
        };

        this.videoElement.onpause = () => {
            //console.log(`[BroccoliFlix] onpause:  ${this.playHandlerEnabled}`);
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
            console.error("Error playing video:", error)
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

//REZKA
//let providedVideoElement = document.querySelector('#player video');
//let providedBufferSpinnerElement = document.querySelector('#oframecdnplayer > pjsdiv:nth-child(15)');
//let providedTimelineElement = document.querySelector('#cdnplayer_control_timeline').children[0];

//YOUTUBE
let providedVideoElement = document.querySelector('.video-stream');
let providedBufferSpinnerElement = document.querySelector('.ytp-spinner');
let providedTimelineElement = document.querySelector('.ytp-progress-bar-container');

let providedAddress = "ws://localhost:3300/default"

let videoClient = new VideoPlayerClient(
    providedAddress,
    providedVideoElement,
    providedBufferSpinnerElement,
    providedTimelineElement);

videoClient.start();

