class VideoPlayerClient {
    state = null;
    utils;
    sender = null;
    tempPauseFunc;
    tempSeekedFunc;
    tempPlayFunc;

    actionsList = {
        PLAY: 'PLAY',
        STOP: 'STOP',
        SYNC: 'SYNC',
        LOAD: 'LOAD',
        PONG: undefined,
    };

    constructor(socketAddress) {
        this.utils = new Utils();
        this.client = new WebSocketClient(socketAddress, null, null, null);
    }

    setVideoElement(videoSelector) {
        this.videoElement = document.querySelector(videoSelector);
        this.addListeners();
        this.addMessageHandler();
    }

    addListeners() {
        const events = ['play', 'pause', 'seeked', 'waiting', 'canplay'];
        const actions =['PLAY', 'STOP', 'SYNC', 'LOAD', 'LOAD_END'];
        console.log(`[BroccoFlix] Adding listeners to video element`);
        console.log(this.videoElement);

        for (let i = 0; i < events.length; i++) {
            this.videoElement[`on${events[i]}`] = () => {
                let action = actions[i];

                if (action === 'STOP' || action === 'PLAY') {
                    this.state = action;
                    console.log(`[BroccoFlix] STATE CHANGED : ${this.state}`);
                }

                if (action === 'LOAD_END') {
                    action = this.state === 'STOP' ? 'LOADED' : 'PLAY';
                }

                console.log(`[BroccoFlix] LOCAL: ${events[i]} - ${action}`);

                this.client.sendMessageToServer({"video_time": this.videoElement.currentTime, "action": action});
            }

            this.tempPlayFunc = this.videoElement.onplay;
            this.tempPauseFunc = this.videoElement.onpause;
            this.tempSeekedFunc = this.videoElement.onseeked;
        }
    }

//TODO: ADD LATENCY CORRECTION
    addMessageHandler() {
        this.client.addMessageHandler((event) => {

            console.log(`[BroccoFlix] Received: ${event.data}`);
            let message = JSON.parse(event.data);
            this.latency = Date.now() - new Date(message.server_time);
            console.log(`[BroccoFlix] Latency: ${this.latency}ms`);
            switch (message.action) {
                case this.actionsList.PONG: {
                    console.log('[BroccoFlix] Received status message');
                    this.clientList = message.client_list;
                    this.my_role = message.role;
                    this.my_name = message.name;
                    break;
                }
                case this.actionsList.PLAY: {
                    this.state = 'PLAY';
                    this.serverPlay();
                    console.log(`[BroccoFlix] STATE CHANGED : ${this.state}`);
                    break;
                }
                case this.actionsList.STOP:
                    this.state = 'STOP';
                    console.log(`[BroccoFlix] STATE CHANGED : ${this.state}`);
                case this.actionsList.LOAD: {
                    this.serverStop();
                    break;
                }
                case this.actionsList.SYNC: {
                    this.serverStop();
                    this.serverTimeChange(message.video_time);
                    break;
                }
            }
        });
    }

    serverStop() {
        if(!this.videoElement.paused) {
            this.videoElement.onpause = () => {
                console.log(`[BroccoFlix] SERVER : PAUSE`);
                this.videoElement.onpause = this.tempPauseFunc;
            };
            this.videoElement.pause();
        }
    }

    serverTimeChange(time) {
        this.videoElement.onseeked = () => {
            console.log(`[BroccoFlix] SERVER CHANGE_TIME`);
            this.videoElement.onseeked = this.tempSeekedFunc;
        };
        this.videoElement.currentTime = time;
    }

    serverPlay() {
        if(this.videoElement.paused) {
            this.videoElement.onplay = () => {
                console.log(`[BroccoFlix] SERVER : PLAY`);
                this.videoElement.onplay = this.tempPlayFunc;
            };
            this.videoElement.play();
        }
    }

    start() {
        //TODO should not connect if videoElement is not found
        // or show allert
        if (this.client.actionOnConnect === null) {
            this.client.actionOnConnect = () => {
                console.log('[BroccoFlix] ActionOnConnect');
                utils.sendMessageToRuntime({ action: 'status', textContent: 'connected' });
            };
            this.client.actionOnReconnect = () => {
                console.log('[BroccoFlix] ActionOnReconnect');
                utils.sendMessageToRuntime({ action: 'status', textContent: 'reconnecting' });
            };
            this.client.actionOnStop = () => {
                console.log('[BroccoFlix] ActionOnStop');
                utils.sendMessageToRuntime({ action: 'status', textContent: 'stop' });
            };
        }

        this.client.connectWebSocket();
        if (!this.videoElement) {
            this.utils.readFromBase("videoSelector").then((videoSelector) => {
                this.setVideoElement(videoSelector);
            });
        }
    }

    stop() {
        this.client.stopListen();
    }

    getStatus(sender) {
        this.sender = (sender ? sender : this.sender);
        // TODO status should be returned to the sender only
        return this.client.getConnectionStatus();
    }
}