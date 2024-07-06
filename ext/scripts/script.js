let utils = new Utils();
let browserAPI = utils.getBrowserApi();

const backBtn = document.getElementById('backBtn');
const settingsPage = document.getElementById('settings-page');
const settingsBtn = document.getElementById('settingsBtn');
const connectPage = document.getElementById('connect-page');
const connectButton = document.getElementById('connect-button');
let videoSelectorInput = document.getElementById('videoSelector');
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
        browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTabId = tabs[0].id;
            if (sender.tab.id === activeTabId) {
                changeButton(message.textContent);
            }
        });
    }
});

async function takeValues() {
    videoSelectorInput.value = await utils.readFromBaseOrDefault("videoSelector", ".video-stream");
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
                await this.utils.sendMessageToActiveTab({action: 'elements_load'});
            }
        }
    );
  });
});
