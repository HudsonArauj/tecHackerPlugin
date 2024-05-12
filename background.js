class TabData {
    constructor() {
        this.reset();
    }

    reset() {
        this.thirdPartyRequests = 0;
        this.firstPartyCookies = 0;
        this.thirdPartyCookies = 0;
        this.localStorageItems = 0;
        this.sessionStorageItems = 0;
        this.hijackingRisk = false;
        this.canvasFingerprintDetected = false;
    }

    countCookies(url, tabHostname) {
        browser.cookies.getAll({ url: url }).then(cookies => {
            cookies.forEach(cookie => {
                const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
                if (cookieDomain.includes(tabHostname)) {
                    this.firstPartyCookies++;
                } else {
                    this.thirdPartyCookies++;
                }
            });
        });
    }

    calculatePrivacyScore() {
        let score = 100;
        score -= this.thirdPartyRequests * 5;
        score -= this.thirdPartyCookies;
        score -= this.localStorageItems * 2;
        score -= this.sessionStorageItems;
        if (this.canvasFingerprintDetected) {
            score -= 25;
        }
        if (this.hijackingRisk) {
            score -= 30;
        }
        return Math.max(score, 0);
    }
}

let tabsData = {};

browser.tabs.onActivated.addListener(activeInfo => {
    const tabId = activeInfo.tabId;
    if (!tabsData[tabId]) {
        tabsData[tabId] = new TabData();
    }
});

browser.webRequest.onCompleted.addListener(details => {
    if (details.tabId !== -1) {
        const tabId = details.tabId;
        if (!tabsData[tabId]) {
            tabsData[tabId] = new TabData();
        }

        const requestUrl = new URL(details.url);
        const requestDomain = requestUrl.hostname;
        const requestPort = requestUrl.port;

        const hijackingRiskPorts = ['8080', '8081', '8443', '8000'];
        if (hijackingRiskPorts.includes(requestPort)) {
            tabsData[tabId].hijackingRisk = true;
        }

        browser.tabs.get(tabId).then(tab => {
            const tabUrl = new URL(tab.url);
            const tabHostname = tabUrl.hostname;
            if (requestDomain !== tabHostname) {
                tabsData[tabId].thirdPartyRequests++;
            }
            tabsData[tabId].countCookies(details.url, tabHostname);
        });
    }
}, { urls: ["<all_urls>"] });

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        tabsData[tabId].reset();
        injectScript(tabId);
    }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "storageData") {
        const tabId = message.tabId;
        tabsData[tabId].localStorageItems = message.localStorageCount;
        tabsData[tabId].sessionStorageItems = message.sessionStorageCount;
        tabsData[tabId].canvasFingerprintDetected = message.canvasFingerprint;
    }

    if (message.request === "getData") {
        const tabId = message.tabId;
        const responseData = {
            ...tabsData[tabId],
            score: tabsData[tabId].calculatePrivacyScore()
        };
        sendResponse(responseData);
    }
});

function injectScript(tabId) {
    const code = `
        browser.runtime.sendMessage({
            type: 'storageData',
            tabId: ${tabId},
            localStorageCount: localStorage.length,
            sessionStorageCount: sessionStorage.length,
            canvasFingerprint: (function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                ctx.textBaseline = "top";
                ctx.font = "14px 'Arial'";
                ctx.fillStyle = "#f60";
                ctx.fillRect(125, 1, 62, 20);
                ctx.fillStyle = "#069";
                ctx.fillText('CANVAS_FINGERPRINT', 2, 15);
                ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
                ctx.fillText('CANVAS_FINGERPRINT', 4, 17);
                var data = canvas.toDataURL();
                return data !== document.createElement('canvas').toDataURL();
            })()
        });
    `;
    browser.tabs.executeScript(tabId, { code: code });
}
