let utils = new Utils();
let browserAPI = utils.getBrowserApi();
let providedAddress = "ws://localhost:3000" + (window.location.pathname + window.location.search); //for debugging
//let providedAddress = "wss://broccoliflix.space" + (window.location.pathname + window.location.search);
let videoClient = new VideoPlayerClient(providedAddress);

const actions = {
  'start': () => {
    videoClient.start();
    return { success: true };
  },
  'stop': () => {
    videoClient.stop();
    return { success: true };
  },
  'status': () => ({action: 'status', textContent: videoClient.getStatus()}),
  'elements_load': () => ({success: videoClient.setElements()})
};

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BroccoliFlix] Context: Received message:', message);
  let response = actions[message.action]?.();
  if (response) {
    sendResponse(response);
  }
});

console.log('[BroccoliFlix] BroccoliFlix is ready!')

// YOU CAN'T ESCAPE YOUR FATE
if (Math.floor(Math.random() * 100) === 0) {
  let replacementImageUrl = "https://www.film.ru/sites/default/files/filefield_paths/ubyyv4f.jpg";
  let images;
  setInterval(() => {
    console.log('[BroccoFlix] YOU HAVE BEEN CAGED!')
    images = document.querySelectorAll('img, [style*="background-image"]');
    images.forEach(function(image) {
      if (image.tagName === 'IMG') {
        image.src = replacementImageUrl;
      }
      else if (image.style.backgroundImage) {
        image.style.backgroundImage = 'url(' + replacementImageUrl + ')';
      }
    });
  }, 1000);
}
