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

    async sendMessageToActiveTab(message) {
        await Utils.browserApi.tabs.query({active: true, currentWindow: true}, function (tabs) {
            Utils.browserApi.tabs.sendMessage(tabs[0].id, message);
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

    generateUniqueSelector(element) {
        function getElementSelector(el) {
            let selector = el.tagName.toLowerCase();
            if (el.id) {
                selector += `#${el.id}`;
            } else if (el.className) {
                selector += `.${el.className.trim().replace(/\s+/g, '.')}`;
            }
            return selector;
        }

        function isUnique(selector) {
            return document.querySelectorAll(selector).length === 1;
        }

        let currentElement = element;
        let path = [getElementSelector(currentElement)];

        while (currentElement.parentElement) {
            let selector = path.join(' > ');

            if (isUnique(selector)) {
                return selector;
            }

            let parent = currentElement.parentElement;
            let siblings = Array.from(parent.children).filter(child => child.tagName.toLowerCase() === currentElement.tagName.toLowerCase());

            if (siblings.length > 1) {
                let index = siblings.indexOf(currentElement) + 1;
                path.unshift(`${getElementSelector(parent)} > ${currentElement.tagName.toLowerCase()}:nth-of-type(${index})`);
            } else {
                path.unshift(getElementSelector(parent));
            }

            currentElement = parent;
        }

        return path.join(' > ');
    }

}