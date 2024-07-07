class Utils {
    static browserApi;

    constructor() {
        this.getBrowserApi();
    }

    getBrowserApi() {
        if (Utils.browserApi === undefined) {
            if (navigator.userAgent.indexOf('Chrome') !== -1) {
                console.log("[BroccoFlix] Browser: Chrome");
                Utils.browserApi = chrome;
            } else if (navigator.userAgent.indexOf('Firefox') !== -1){
                console.log("[BroccoFlix] Browser: Firefox");
                Utils.browserApi = browser;
            } else {
                console.log("[BroccoFlix] ! BROWSER IS NOT RECOGNIZED !")
                Utils.browserApi = null;
            }
        }
        return Utils.browserApi;
    }

    sendMessageToRuntime(message) {
        Utils.browserApi.runtime.sendMessage(message);
    }

    sendMessageToActiveTab(message, func) {
        Utils.browserApi.tabs.query({active: true, currentWindow: true}, function (tabs) {
            Utils.browserApi.tabs.sendMessage(tabs[0].id, message, func);
        });
    }

    async writeToBase(key, value) {
        try {
            await new Promise((resolve, reject) => {
                Utils.browserApi.storage.local.set({ [key]: value }, () => {
                    if (Utils.browserApi.runtime.lastError) {
                        reject(new Error(Utils.browserApi.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error(`Error when writing to local storage: ${error.message}`);
            throw error;
        }
    }

    async readFromBase(key) {
        try {
            return await new Promise((resolve, reject) => {
                Utils.browserApi.storage.local.get(key, (result) => {
                    if (Utils.browserApi.runtime.lastError) {
                        reject(new Error(Utils.browserApi.runtime.lastError.message));
                    } else {
                        resolve(result[key]);
                    }
                });
            });
        } catch (error) {
            console.error(`Error when reading from local storage: ${error.message}`);
            throw error;
        }
    }

    async readFromBaseOrDefault(key, defaultValue) {
        try {
            const result = await utils.readFromBase(key);
            console.log(`Value of ${key}: \"${result}\"`);
            if (result && result !== "") {
                return result;
            } else {
                console.log(`Value was empty. Using default value: ${defaultValue}`);
                await utils.writeToBase(key, defaultValue);
                return utils.readFromBase(key);
            }
        } catch (error) {
            console.error("Reading from the local storage failed:", error);
            return defaultValue;
        }
    }

}