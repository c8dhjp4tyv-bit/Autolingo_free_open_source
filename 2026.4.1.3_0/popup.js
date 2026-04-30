var enabled = false;

const update_slider = (node_id, text_id, enabled_text, disabled_text, value) => {
    const input_switch = document.getElementById(node_id);
    const text_elem = document.getElementById(text_id);

    if (!input_switch || !text_elem) return;

    if (value) {
        text_elem.innerText = enabled_text;
        input_switch.checked = true;
    } else {
        text_elem.innerText = disabled_text;
        input_switch.checked = false;
    }
}

const update_enabled_slider = (value) => {
    update_slider(
        "toggle-enabled-input", "toggle-enabled-text",
        "Automation Enabled", "Automation Disabled",
        value
    );
}

const toggle_extension_enabled = () => {
    enabled = !enabled;
    chrome.storage.local.set({ autolingo_enabled: enabled });
    update_enabled_slider(enabled);
}

const send_event = (actionType, data = {}) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: actionType,
                ...data
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("Could not send message to content script:", chrome.runtime.lastError.message);
                }
            });
        } else {
            console.log("No suitable active tab found to send message.");
        }
    });
}

const solve_challenge = () => {
    send_event("solve_challenge");
}

const solve_skip_challenge = () => {
    send_event("solve_skip_challenge");
}

const render_content = () => {
    let content_div = document.getElementById("content");

    content_div.innerHTML = `
        <div class="slider-container content-row">
            <label class="autolingo-switch">
                <input id="toggle-enabled-input" type="checkbox">
                <span class="autolingo-slider"></span>
            </label>
            <div id="toggle-enabled-text">Automation Disabled</div>
        </div>
        <div id="status-text" class="content-row" style="font-size: 0.9em; text-align: center; margin-bottom: 5px;">Status: Free</div>
        <div class="content-row" style="font-size: 0.85em; text-align: center; color: #666; margin-bottom: 10px;">
            This extension is now free and open source.
        </div>
        <div class="delay-container content-row">
            <label for="delay-input">Solve Delay (ms):</label>
            <input type="number" id="delay-input" min="0" max="2000" step="50">
        </div>
        <div class="solve-skip-container content-row">
            <button id="solve-skip-button" class="row-button" title="Ctrl+Enter">Solve & Skip</button>
        </div>
        <div class="solve-container content-row">
            <button id="solve-button" class="row-button" title="Alt+Enter">Solve</button>
        </div>
    `;

    const toggleEnabledInput = document.getElementById("toggle-enabled-input");
    if (toggleEnabledInput) {
        toggleEnabledInput.onclick = toggle_extension_enabled;
    }

    document.getElementById("solve-button").onclick = solve_challenge;
    document.getElementById("solve-skip-button").onclick = solve_skip_challenge;

    const delayInput = document.getElementById("delay-input");
    chrome.storage.local.get("autolingo_delay", (response) => {
        let currentDelay = response.autolingo_delay;
        if (typeof currentDelay !== 'number' || currentDelay < 0 || currentDelay > 2000) {
            currentDelay = 500;
        }
        delayInput.value = currentDelay;
    });

    delayInput.onchange = () => {
        let delay = parseInt(delayInput.value, 10);
        if (isNaN(delay) || delay < 0) {
            delay = 0;
        } else if (delay > 2000) {
            delay = 2000;
        }
        delayInput.value = delay;
        chrome.storage.local.set({ autolingo_delay: delay });
        send_event("set_delay", { delay });
    };

    update_enabled_slider(enabled);
}

// ON LOAD
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get([
        "autolingo_enabled"
    ], (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error getting data from storage:", chrome.runtime.lastError);
            document.body.innerHTML = "<p>Error loading extension data.</p>";
            return;
        }

        enabled = response.autolingo_enabled !== undefined ? Boolean(response.autolingo_enabled) : true;
        render_content();
    });
});
