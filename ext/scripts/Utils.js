class Utils {
    browserApi;

    constructor() {
        this.getBrowserApi();
    }

    getBrowserApi() {
        if (this.browserApi === undefined) {
            if (navigator.userAgent.indexOf('Chrome') !== -1) {
                console.log("[BroccoliFlix] Browser: Chrome");
                this.browserApi = chrome;
            } else if (navigator.userAgent.indexOf('Firefox') !== -1){
                console.log("[BroccoliFlix] Browser: Firefox");
                this.browserApi = browser;
            } else {
                console.log("[BroccoliFlix] ! BROWSER IS NOT RECOGNIZED !")
                this.browserApi = null;
            }
        }
        return this.browserApi;
    }

    sendMessageUsingBrowserApi(message) {
        browserAPI.runtime.sendMessage(message);
    }

    async sendMessageToActiveTab(message) {
        await browserAPI.tabs.query({active: true, currentWindow: true}, function (tabs) {
            browserAPI.tabs.sendMessage(tabs[0].id, message);
        });
    }

    async writeToBase(key, value) {
        try {
            await new Promise((resolve, reject) => {
                this.browserApi.storage.local.set({ [key]: value }, () => {
                    if (this.browserApi.runtime.lastError) {
                        reject(new Error(this.browserApi.runtime.lastError.message));
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
                this.browserApi.storage.local.get(key, (result) => {
                    if (this.browserApi.runtime.lastError) {
                        reject(new Error(this.browserApi.runtime.lastError.message));
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
            console.log("Read " + key + ": " + result);
            if (result && result !== "") {
                return result;
            } else {
                console.log("was empty");
                await utils.writeToBase(key, defaultValue);
                return utils.readFromBase(key);
            }
        } catch (error) {
            console.error("Ошибка при чтении из локального хранилища:", error);
            return defaultValue;
        }
    }
}