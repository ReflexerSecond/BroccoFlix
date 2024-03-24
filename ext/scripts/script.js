// TODO This code is piece of shit
//  1. I NEED TO REFACTOR THIS
// BUG! When somebody not ready others can start!
let utils = new Utils();
let browserAPI = utils.getBrowserApi();

const backBtn = document.getElementById('backBtn');
const settingsPage = document.getElementById('settings-page');
const settingsBtn = document.getElementById('settingsBtn');
const connectPage = document.getElementById('connect-page');
const connectButton = document.getElementById('connect-button');
let videoSelectorInput = document.getElementById('videoSelector');
let timelineSelectorInput = document.getElementById('timelineSelector');
let bufferRingSelectorInput = document.getElementById('bufferRingSelector');
let saveBtn = document.getElementById('saveBtn');


connectButton.addEventListener('click', function() {
    const actionVal = (connectButton.textContent === 'Pause') ? 'stop' : 'start';
    utils.sendMessageToActiveTab({ action: actionVal.toString() });
});

function changeButton(state) {
  const classes = ['connected', 'connecting'];
  connectButton.classList.remove(...classes);

  switch (state) {
      case 'stop':
          connectButton.textContent = 'Connect';
          break;
      case 'reconnecting':
          connectButton.textContent = 'Pause';
          connectButton.classList.add('connecting');
          break;
      case 'connected':
          connectButton.textContent = 'Pause';
          connectButton.classList.add('connected');
          break;
  }
}

backBtn.onclick = () => {
    backBtn.classList.add('hidden');
    settingsPage.classList.add('hidden');
    settingsBtn.classList.remove('hidden');
    connectPage.classList.remove('hidden');
}

settingsBtn.onclick = () => {
    backBtn.classList.remove('hidden');
    settingsPage.classList.remove('hidden');
    settingsBtn.classList.add('hidden');
    connectPage.classList.add('hidden');
}


browserAPI.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'status') {
    changeButton(message.textContent)
  }
});

async function takeValues() {
    videoSelectorInput.value = await utils.readFromBaseOrDefault("videoSelector", ".video-stream");
    timelineSelectorInput.value = await utils.readFromBaseOrDefault("timelineSelector", ".ytp-progress-bar-container");
    bufferRingSelectorInput.value = await utils.readFromBaseOrDefault("bufferRingSelector", ".ytp-spinner");
}

document.addEventListener('DOMContentLoaded', function() {
    browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tabId = tabs[0].id;
    browserAPI.tabs.sendMessage(tabId, { action: 'status' }, function(response) {
      changeButton(response.textContent);
    });

    takeValues().then(() => {
            saveBtn.onclick = async () => {
                await utils.writeToBase("videoSelector", videoSelectorInput.value);
                await utils.writeToBase("timelineSelector", timelineSelectorInput.value);
                await utils.writeToBase("bufferRingSelector", bufferRingSelectorInput.value);
                await this.utils.sendMessageToActiveTab({action: 'elements_load'});
            }
        }
    );
  });
});