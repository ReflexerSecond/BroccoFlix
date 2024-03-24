class WebSocketClient {
    socket = null;
    currentTimeoutId = null;
    utils = new Utils();

    //Setup
    constructor(address) {
        this.address = address;
    }

    addListeners() {
        //opening and closing
        this.socket.onopen = () => {
            console.log('[BroccoliFlix] Connected');
            this.utils.sendMessageUsingBrowserApi({ action: 'status', textContent: 'connected'});
        }

        this.socket.onclose = () => {
            console.log('[BroccoliFlix] Connection closed!');

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

    connectWebSocket() {
        this.utils.sendMessageUsingBrowserApi({ action: 'status', textContent: 'reconnecting'});
        this.socket = new WebSocket(this.address);
        this.addListeners();
    }

    //Control methods
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
        this.utils.sendMessageUsingBrowserApi({ action: 'status', textContent: 'stop'});
    }

    getStatus() {
        if (this.socket != null && this.socket.readyState === WebSocket.OPEN) {
            return 'connected';
        }
        return (this.currentTimeoutId != null)? 'reconnecting' : 'stopped';
    }
}