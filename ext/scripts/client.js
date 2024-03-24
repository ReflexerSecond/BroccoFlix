let utils = new Utils();
let browserAPI = utils.getBrowserApi();
//"ws://localhost:3000" for debug
let providedAddress = "wss://broccoliflix.space" + (window.location.pathname + window.location.search);
let videoClient = new VideoPlayerClient(providedAddress);

browserAPI.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  const actions = {
    'start': () => {
      videoClient.start();
      return { success: true };
    },
    'stop': () => {
      videoClient.stop();
      return { success: true };
    },
    'status': () => {
      return { action: 'status', textContent: videoClient.getStatus() };
    },
    'elements_load': () => {
      videoClient.setElements();
      return { success: true };
    }
  };

  if (actions[message.action]) {
    sendResponse(actions[message.action]());
  }
});

console.log('[BroccoliFlix] BroccoliFlix is ready!')