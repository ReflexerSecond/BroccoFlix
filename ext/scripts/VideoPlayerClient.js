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
        this.lastAction = Promise.resolve();
        this.utils = new Utils();
        this.client = new WebSocketClient(socketAddress, null, null, null);
    }

    setVideoElement(videoSelector) {
        this.videoElement = document.querySelector(videoSelector);
        this.addListeners();
        this.addMessageHandler();
    }

    addListeners() {
        const events = ['play', 'pause', /*'seeked',*/ 'waiting', 'canplay'];
        const actions =['PLAY', 'STOP', /*'SYNC',*/ 'LOAD', 'LOADED'];
        console.log(`[BroccoFlix] Adding listeners to video element`);
        console.log(this.videoElement);

        for (let i = 0; i < events.length; i++) {
            this.videoElement[`on${events[i]}`] = () => {
                console.log(`[BroccoFlix] on${events[i]} - start`);
                let action = actions[i];

                if (action === 'STOP' || action === 'PLAY') {
                    this.serverStop();
                    this.state = action;
                }
                if (action === 'LOADED') {
                    this.serverStop();

                }

                console.log(`[BroccoFlix] LOCAL: ${events[i]} - ${action}`);

                this.client.sendMessageToServer({"video_time": this.videoElement.currentTime, "action": action});
                console.log(`[BroccoFlix] on${events[i]} - end`);
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
                    console.log(`[BroccoFlix] STATE CHANGED : ${this.state}`);
                    if (message.video_time !== this.videoElement.currentTime) {
                        this.addActionToQueue(videoClient.serverStop);
                        this.videoElement.currentTime = message.video_time;
                    } else {
                        this.addActionToQueue(this.serverPlay);
                    }
                    break;
                }
                case this.actionsList.STOP:
                    this.state = 'STOP';
                    console.log(`[BroccoFlix] STATE CHANGED : ${this.state}`);
                case this.actionsList.LOAD: {
                    this.addActionToQueue(videoClient.serverStop);
                    break;
                }
                case this.actionsList.SYNC: {
                    console.log(`[BroccoFlix] SYNC recieved!`);
                    this.addActionToQueue(videoClient.serverStop);
                    this.addActionToQueue(videoClient.serverTimeChange, message.video_time);
                    break;
                }
            }
        });
    }

    serverStop() {
        if(!videoClient.videoElement.paused) {
            videoClient.videoElement.onpause = () => {
                console.log(`[BroccoFlix] SERVER : PAUSE`);
                videoClient.videoElement.onpause = videoClient.tempPauseFunc;
            };
            videoClient.videoElement.pause();
        }
    }

    serverTimeChange(time) {
        console.log(`[BroccoFlix] Trying to change time - start`);
        videoClient.videoElement.onplay = () => {
            console.log(`[BroccoFlix] SERVER : timeupdate PLAY`);
            videoClient.videoElement.onplay = videoClient.tempPlayFunc;
        };
        videoClient.videoElement.currentTime = time;
        console.log(`[BroccoFlix] Trying to change time - end`);
    }

    serverPlay() {
        if(videoClient.videoElement.paused) {
            videoClient.videoElement.onplay = () => {
                console.log(`[BroccoFlix] SERVER : PLAY`);
                videoClient.videoElement.onplay = videoClient.tempPlayFunc;
            };
            videoClient.videoElement.play();
        }
    }

    start() {
        //TODO should not connect if videoElement is not found
        // or show alert
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
        //TODO - need to remove listeners
        this.client.stopListen();
    }

    getStatus(sender) {
        this.sender = (sender ? sender : this.sender);
        // TODO status should be returned to the sender only
        return this.client.getConnectionStatus();
    }

    addActionToQueue(action, ...args) {
        this.lastAction = this.lastAction.then(() => {
            const result = action(...args);
            if (result instanceof Promise) {
                return result;
            }
            return Promise.resolve(result);
        }).catch(err => {
            console.error('Action failed:', err);
        });
        return this.lastAction;
    }
}