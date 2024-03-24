class VideoPlayerClient {
    playHandlerEnabled = true;
    utils = new Utils();
    //Setup
    constructor(socketAddress) {
        this.client = new WebSocketClient(socketAddress);
        this.messageHandler = (event) => {
            const command = event.data.split(':');

            switch (command[0]) {
                // FIXME PLAY AND PAUSE with flag playHandlerEnabled is unbelievably bad solution
                //  but
                case 'play':
                    console.log('[BroccoliFlix] Received: PLAY');
                    this.playHandlerEnabled = false;
                    this.videoElement.play().then(() => { this.playHandlerEnabled = true; });
                    break;
                case 'pause':
                    console.log('[BroccoliFlix] Received: PAUSE');
                    this.playHandlerEnabled = false;
                    this.videoElement.pause();
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

    setElements() {
        this.utils.readFromBase("videoSelector").then((videoSelector) =>
            this.utils.readFromBase("bufferRingSelector").then((bufferRingSelector) =>
                this.utils.readFromBase("timelineSelector").then((timelineSelector) => {
                    this.videoElement = document.querySelector(videoSelector);
                    this.bufferSpinnerElement = document.querySelector(bufferRingSelector);
                    this.timelineElement = document.querySelector(timelineSelector);

                    console.log("[BroccoliFlix]\nvideoElement: " + this.videoElement +
                        "\nbufferSpinnerElement: " + this.bufferSpinnerElement +
                        "\ntimelineElement: " + this.timelineElement);

                    this.addListeners();
                    this.client.addMessageHandler(this.messageHandler);
                    }
                )
            )
        )
    }

    addListeners() {
        //setup listeners for manual play/pause/change_time commands
        this.videoElement.onplay = () => {
            console.log("onplay:" + this.playHandlerEnabled);
            if (this.playHandlerEnabled) {
                this.client.send(`ready:${this.videoElement.currentTime}`);
                this.client.send(`play:${this.videoElement.currentTime}`);
            }
        };

        this.videoElement.onpause = () => {
            console.log("onpause:" + this.playHandlerEnabled);
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

    //Control methods
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
}