/**
 * WebSocketClient is a class that handles WebSocket connections.
 * It provides methods to connect, send messages, and handle events related to the WebSocket.
 */
class WebSocketClient {
    /**
     * Constructs a new WebSocketClient instance.
     * @param {string} address - The WebSocket server address.
     * @param {function} actionOnConnect - The function to call when the WebSocket connection is opened.
     * @param {function} actionOnDisconnect - The function to call when the WebSocket connection is closed.
     * @param {function} actionOnStop - The function to call when the WebSocket connection is stopped.
     */
    constructor(address, actionOnConnect, actionOnDisconnect, actionOnStop) {
        this.address = address;
        this.actionOnConnect = actionOnConnect;
        this.actionOnReconnect = actionOnDisconnect;
        this.actionOnStop = actionOnStop;
    }
    socket = null;
    currentTimeoutId = null;
    actionOnConnect = null;
    actionOnReconnect = null;
    actionOnStop = null;
    messageHandler = null;
    serverOperationsInProgress = 0;
    isServerOperation = false;

    /**
     * Adds event listeners to the WebSocket instance.
     * The event listeners handle opening, closing, and receiving messages from the WebSocket server.
     */
    addListeners() {
        this.socket.onopen = () => this.handleOpen();
        this.socket.onclose = () => this.handleClose();
        this.socket.onmessage = this.messageHandler;
    }

    handleOpen() {
        console.log('[BroccoFlix] Connected');
        this.sendMessageToServer({"video_time": 0, "action": "PING"});
        if (this.actionOnConnect) {
            this.actionOnConnect();
        }
    }

    handleClose() {
        console.log('[BroccoFlix] Connection closed!');
        this.socket.close();
        if (this.actionOnReconnect) {
            this.actionOnReconnect();
        }
        this.currentTimeoutId = setTimeout(() => this.connectWebSocket(), 5000);
    }

    /**
     * 1. Adds a message handler to the WebSocket instance.
     * 2. Saves it because we will need to add it again after reconnecting.
     * @param {function} messageHandler - The function to call when a message is received from the WebSocket server.
     */
    addMessageHandler(messageHandler) {
        this.messageHandler = messageHandler;
        this.socket.onmessage = messageHandler
    }

    /**
     * Connects to the WebSocket server.
     */
    connectWebSocket() {
        if (this.socket == null
            || this.socket.readyState === WebSocket.CLOSED
            || this.socket.readyState === WebSocket.CLOSING) {
        this.socket = new WebSocket(this.address);
        this.addListeners();
        }
    }

    /**
     * Sends a message to the WebSocket server.
     * @param {object} message - The message to send to the WebSocket server.
     */
    sendMessageToServer(message) {
        console.log('[BroccoFlix] Sending message to server:', message);
        this.socket.send(JSON.stringify(message));
    }

    /**
     * Stops listening to the WebSocket server.
     */
    stopListen() {
        this.socket.onclose = null;
        if (this.currentTimeoutId != null) {
            clearTimeout(this.currentTimeoutId)
            this.currentTimeoutId = null;
        }
        this.socket.close();
        console.log('[BroccoFlix] Connection closed by user');
        if (this.actionOnStop) {
            this.actionOnStop();
        }
    }

    /**
     * Gets the current connection status.
     * @returns {string} The current connection status ('connected', 'reconnecting', or 'stopped').
     */
    getConnectionStatus() {
        if (this.socket?.readyState === WebSocket.OPEN)
            return 'connected';
        if (this.currentTimeoutId)
            return 'reconnecting';
        return 'stopped';
    }

    // TODO: Add a latency check method
}
socket = new WebSocketClient("http://localhost:3000")