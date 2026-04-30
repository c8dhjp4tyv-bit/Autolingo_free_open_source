let enabled = true;

const set_badge = async () => {
    const { autolingo_enabled } = await chrome.storage.local.get(["autolingo_enabled"]);
    const currentEnabled = autolingo_enabled !== undefined ? autolingo_enabled : true;

    if (currentEnabled) {
        chrome.action.setBadgeText({ text: "✓" });
        chrome.action.setBadgeBackgroundColor({ color: "green" });
    } else {
        chrome.action.setBadgeText({ text: "X" });
        chrome.action.setBadgeBackgroundColor({ color: "#EC5053" });
    }
};

chrome.storage.local.get(["autolingo_enabled"], (result) => {
    if (chrome.runtime.lastError) {
        console.error("Error reading autolingo_enabled from storage:", chrome.runtime.lastError);
        return;
    }

    if (result.autolingo_enabled === undefined) {
        chrome.storage.local.set({ autolingo_enabled: true });
    }
});

setInterval(set_badge, 1000);
set_badge();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // The popup does not require external payment actions anymore.
    return true;
});
