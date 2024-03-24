// TODO This code is piece of shit
//  I NEED TO REFACTOR THIS
let browserAPI;
// Check browser
if (navigator.userAgent.indexOf('Chrome') !== -1) {
    console.log("[BroccoliFlix] Chrome");
    browserAPI = chrome;
} else if (navigator.userAgent.indexOf('Firefox') !== -1){
    console.log("[BroccoliFlix] Firefox");
    browserAPI = browser;
} else {
    console.log("[BroccoliFlix] ! BROWSER IS NOT RECOGNIZED !")
}

const connectButton = document.getElementById('connect-button');

async function takeValues() {
    videoSelectorInput.value = await getValueFromLocalStorage("videoSelector", ".video-stream");
    timelineSelectorInput.value = await getValueFromLocalStorage("timelineSelector", ".ytp-progress-bar-container");
    bufferRingSelectorInput.value = await getValueFromLocalStorage("bufferRingSelector", ".ytp-spinner");
}


function toggleButtonText() {
  if (connectButton.textContent === 'Pause') {
    browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;
      browserAPI.tabs.sendMessage(tabId, { action: 'stop' });
    });
  } else {
    browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;
      browserAPI.tabs.sendMessage(tabId, { action: 'start' });
    });
  }
}

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
      default:
          break;
  }
}

connectButton.addEventListener('click', function() {
  toggleButtonText();
});

browserAPI.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'status') {
    changeButton(message.textContent)
  }
});

document.addEventListener('DOMContentLoaded', function() {
    browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tabId = tabs[0].id;
    browserAPI.tabs.sendMessage(tabId, { action: 'status' }, function(response) {
      changeButton(response.textContent)
    });
    takeValues().then(r => {
            saveBtn.onclick = async () => {
                await writeToBase("videoSelector", videoSelectorInput.value);
                await writeToBase("timelineSelector", timelineSelectorInput.value);
                await writeToBase("bufferRingSelector", bufferRingSelectorInput.value);
                await browserAPI.tabs.query({active: true, currentWindow: true}, function (tabs) {
                    browserAPI.tabs.sendMessage(tabs[0].id, {action: 'elements_load'});
                });
            }
        }
    );
  });
});

const backBtn = document.getElementById('backBtn');
const settingsPage = document.getElementById('settings-page');
const settingsBtn = document.getElementById('settingsBtn');
const connectPage = document.getElementById('connect-page');
var videoSelectorInput = document.getElementById('videoSelector');
var timelineSelectorInput = document.getElementById('timelineSelector');
var bufferRingSelectorInput = document.getElementById('bufferRingSelector');
var saveBtn = document.getElementById('saveBtn');

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

async function getValueFromLocalStorage(key, defaultValue) {
    try {
        const result = await readFromBase(key);
        console.log("Read " + key + ": " + result);
        if (result && result !== "") {
            return result;
        } else {
            console.log("was empty");
            await writeToBase(key, defaultValue);
            return readFromBase(key);
        }
    } catch (error) {
        console.error("Ошибка при чтении из локального хранилища:", error);
        return defaultValue;
    }
}

async function writeToBase(key, value) {
    await new Promise((resolve, reject) => {
        browserAPI.storage.local.set({ [key]: value }, () => {
            if (browserAPI.runtime.lastError) {
                reject(browserAPI.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

async function readFromBase(key) {
    return new Promise((resolve, reject) => {
        browserAPI.storage.local.get(key, (result) => {
            if (browserAPI.runtime.lastError) {
                reject(browserAPI.runtime.lastError);
            } else {
                resolve(result[key]);
            }
        });
    });
}