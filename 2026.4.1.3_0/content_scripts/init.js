// // function for injecting a file as a script so we can use it
const injectScript = (fileName) => {
    // append the content script as a script element to the page
    // so that it has proper permissions to modify video elements
    let th = document.getElementsByTagName('body')[0];
    let s = document.createElement('script');
    s.setAttribute('type', 'module');

    // set the source attribute for the injected script
    s.setAttribute('src', `chrome-extension://${chrome.runtime.id}/${fileName}`);
    th.appendChild(s);
}

const send_custom_event = (event_name, data=null) => {
    var event = document.createEvent("CustomEvent")
    event.initCustomEvent(event_name, true, true, {"data": data});
    document.dispatchEvent(event);
}

const getAssetDataUrl = async (fileName) => {
    const response = await fetch(chrome.runtime.getURL(fileName));
    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

let isScriptInjected = false;

if (!isScriptInjected) {
    injectScript("content_scripts/injected.js");
    isScriptInjected = true;
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.autolingo_enabled) {
            const isEnabled = changes.autolingo_enabled.newValue;
            if (isEnabled) {
                send_custom_event("enable_automation");
            } else {
                send_custom_event("disable_automation");
            }
        }
    }
});

// add a listener that forwards messages to the injected script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "solve_challenge":
            send_custom_event("solve_challenge");
            break;
        case "solve_skip_challenge":
            send_custom_event("solve_skip_challenge");
            break;
        case "set_delay":
            console.log(message)
            send_custom_event("set_delay", message.delay);
            break;
        default:
            console.error(`Given unknown message type '${message.action}'`);
    }
});

// when the extension asks for the id, give it!
window.addEventListener("get_extension_id", async () => {
    const extensionId = chrome.runtime.id;
    send_custom_event("extension_id", extensionId);
    try {
        const [tierIconUrl, legendaryIconUrl] = await Promise.all([
            getAssetDataUrl("images/diamond-league.png"),
            getAssetDataUrl("images/legendary.svg"),
        ]);
        send_custom_event("set_icon_assets", { tierIconUrl, legendaryIconUrl });
    } catch (error) {
        console.error("Failed to load Autolingo icon assets", error);
    }

    console.log("fetching autolingo initial state (enabled status and delay)")
    chrome.storage.local.get([
        "autolingo_enabled",
        "autolingo_delay",
    ], (response) => {
        const isEnabled = response["autolingo_enabled"] !== undefined ? Boolean(response["autolingo_enabled"]) : true;
        let delay = response["autolingo_delay"];
        const defaultDelay = 500;

        if (typeof delay !== 'number' || delay < 0 || delay > 2000) {
            delay = defaultDelay;
        }

        console.log("autolingo initial state:", { isEnabled, delay })
        send_custom_event("set_initial_state", { isEnabled, delay });
    });
});
