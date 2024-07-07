let utils = new Utils();
let browserAPI = utils.getBrowserApi();

const backBtn = document.getElementById('backBtn');
const settingsPage = document.getElementById('settings-page');
const settingsBtn = document.getElementById('settingsBtn');
const connectPage = document.getElementById('connect-page');
const connectButton = document.getElementById('connect-button');
let videoSelectorInput = document.getElementById('videoSelector');
let saveBtn = document.getElementById('saveBtn');
let pipetteBtn = document.getElementById('pipetteBtn');
let currentStatus = "stop";

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
    utils.readFromBaseOrDefault("videoSelector", ".video-stream").then(x=> videoSelectorInput.value = x);
}

saveBtn.onclick = async () => {
    await utils.writeToBase("videoSelector", videoSelectorInput.value);
    utils.sendMessageToActiveTab({action: 'elements_load'}, ()=>{});
}

pipetteBtn.onclick = () => {
    utils.sendMessageToActiveTab({action: 'pipette'}, ()=>{});
}


//Connection button logic
/**
 * When popup opens we need to ask for a status from client to know which button we need to show
 * */
utils.sendMessageToActiveTab({ action: 'status' }, (response)=> changeButton(response.textContent));

/**
 * When connection button is clicked - it should send action 'stop' or start from popup
 * to the active page
 * */
connectButton.addEventListener('click', function() {
    const actionVal = (connectButton.textContent === 'Pause') ? 'stop' : 'start';
    utils.sendMessageToActiveTab({ action: actionVal.toString() });
});



browserAPI.runtime.onMessage.addListener(function(message, sender) {
    if (message.action === 'status') {
        browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (sender.tab.id === tabs[0].id)
                currentStatus = message.textContent;
                changeButton(currentStatus);
        });
    }
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
