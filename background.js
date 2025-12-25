// Background service worker for keyboard shortcuts

chrome.commands.onCommand.addListener((command) => {
    if (command === "open-full-page") {
        chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
    }
});
