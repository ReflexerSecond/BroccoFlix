// Global variables
let socketAddress = "ws://localhost:3300/default";
let socket = null;
let intervalId = null;
let playHandlerEnabled = true;

// Elements
const video = document.querySelector('#player video');
const bufferSpinner = document.querySelector(
    '#oframecdnplayer > pjsdiv:nth-child(15)');

// Connect to WebSocket
function connectWebSocket() {
  if (socket) {
    return socket;
  }

  socket = new WebSocket(socketAddress);

  socket.addEventListener('open', () => {
    console.log('[BroccoliFlix] Connected');
    clearInterval(intervalId);
    intervalId = null;
  });

  const reconnectWebSocket = () => {
    socket = null;
    console.log('[BroccoliFlix] Connection closed!');
    if (intervalId === null) {
      intervalId = setInterval(connectWebSocket, 5000);
    }
  };

  socket.addEventListener('close', reconnectWebSocket);
  socket.addEventListener('error', () => {
    socket.close();
    reconnectWebSocket();
  });

  socket.addEventListener('message', (event) => {
    const command = event.data.split(':');

    switch (command[0]) {
      case 'play':
        console.log('[BroccoliFlix] Recieved: PLAY');
        playVideoByServer();
        break;
      case 'pause':
        console.log('[BroccoliFlix] Recieved: PAUSE');
        stopVideoByServer();
        break;
      case 'changetime':
        console.log('[BroccoliFlix] Recieved: TIME SYNC');
        video.currentTime = command[1];
        break;
      case 'status':
        console.log(`[GangWatch] Recieved: STATUS:\n${command[1]}`);
        break;
    }
  });
}

// Initialize WebSocket connection
connectWebSocket();

// Send 'changetime' event when timeline is changed
const cdnplayerControlTimeline = document.querySelector(
    '#cdnplayer_control_timeline').children[0];
cdnplayerControlTimeline.onclick = () => {
  socket.send(`changetime:${video.currentTime}`);
};

// Play video by server command
function playVideoByServer() {
  playHandlerEnabled = false;
  video.play()
  .then(() => {
    setTimeout(() => {
      playHandlerEnabled = true;
    }, 100);
  }).catch(error => {
    playHandlerEnabled = true;
    console.error("Error playing video:", error)
  });
}

// Stop video by server command
function stopVideoByServer() {
  playHandlerEnabled = false;
  video.pause();
  setTimeout(() => {
    playHandlerEnabled = true;
  }, 100);
}

// Event listeners for video playback
video.onplay = () => {
  console.log(`[GangWatch] onplay: ${playHandlerEnabled}`);
  socket.send(`ready:${video.currentTime}`);
  if (playHandlerEnabled) {
    socket.send(`play:${video.currentTime}`);
  }
};

video.onpause = () => {
  console.log(`[GangWatch] onpause:  ${playHandlerEnabled}`);
  if (playHandlerEnabled) {
    socket.send(`pause:${video.currentTime}`);
  }
};

// Check if video is buffering
let lastBufferSpinnerValue = bufferSpinner.style.display;

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.attributeName === 'style' && bufferSpinner.style.display
        !== lastBufferSpinnerValue) {
      lastBufferSpinnerValue = bufferSpinner.style.display;
      if (lastBufferSpinnerValue !== 'none') {
        socket.send(`notready:${video.currentTime}`);
      }
    }
  });
});

observer.observe(bufferSpinner, {attributes: true});

// Notify server when video is ready to play
video.oncanplay = () => {
  socket.send(`ready:${video.currentTime}`);
};