import ReactUtils from "./ReactUtils.js"
import DuolingoSkill from "./DuolingoSkill.js"
import DuolingoChallenge from "./DuolingoChallenge.js"

const DEBUG = true;

window.ru = new ReactUtils();

// append an iframe so we can re-enable console.log
// using its window.log
const frame = document.createElement('iframe');
frame.style.display = "none";
document.body.appendChild(frame);

// if DEBUG, re-enable console.log as window.log
const welcome_message = "Welcome to Autolingo!";
if (DEBUG) {
    window.log = frame.contentWindow.console.log
} else {
    window.log = () => {}
}

// print our welcome message regardless
window.log(welcome_message);

// if the user changes the language, re-inject
let previous_language = null;
let previous_url = null;
setInterval(() => {
    // get the current language from the page
    const page_data = window.ru.ReactFiber(document.querySelector("._3BJQ_"))?.return?.stateNode?.props;
    const current_language = page_data?.courses?.find(e => { return e.isCurrent; })?.learningLanguageId;

    // get current url
    const current_url = document.location.href;

    // DEBUG INFO
    // window.log("language watch", previous_language, current_language);
    // window.log("url watch", previous_url, current_url);

    // if the language changed, we know we just loaded the home page
    if (previous_language !== current_language || previous_url !== current_url) {
        // window.log(previous_url, current_url)
        inject_autolingo();
        previous_language = current_language;
        previous_url = current_url;
    }
}, 100);

let stylesheet_loaded = false;
let the_extension_id = null;
let isAutomationEnabled = false;
let isAutolingoInjected = false;
let currentObserver = null;
let pendingInjectionInterval = null;
let tier_img_url = null;
let legendary_img_url = null;

// inject stylesheet, buttons, etc.
const inject = (extension_id) => {
    the_extension_id = extension_id;
    // inject stylesheet
    let stylesheet = document.createElement("LINK");
    stylesheet.setAttribute("rel", "stylesheet")
    stylesheet.setAttribute("type", "text/css")
    stylesheet.setAttribute("href", `${the_extension_id}/content_scripts/main.css`)
    document.body.appendChild(stylesheet)
    stylesheet.onload = () => {
        stylesheet_loaded = true;
    }

    document.addEventListener("solve_challenge", () => {
        const challenge = new DuolingoChallenge();
        challenge.solve().then(() => {
            window.autolingo.solving = false;
        }).catch(error => {
            console.error(error);
        });
    });

    document.addEventListener("solve_skip_challenge", () => {
        const challenge = new DuolingoChallenge();
        challenge.solve().then(() => {
            challenge.click_next();
            window.autolingo.solving = false;
        }).catch(error => {
            console.error(error);
        });
    });
}

const inject_autolingo = () => {
    if (!isAutomationEnabled) return;
    if (!the_extension_id || !tier_img_url || !legendary_img_url) return;
    
    remove_autolingo();
    
    // Clear any pending injection interval
    if (pendingInjectionInterval) {
        clearInterval(pendingInjectionInterval);
        pendingInjectionInterval = null;
    }
    
    pendingInjectionInterval = setInterval(() => {
        if (stylesheet_loaded && the_extension_id && tier_img_url && legendary_img_url) {
            const targetNode = document.querySelector('[data-test="skill-path"]');
            if (!targetNode) return;

            clearInterval(pendingInjectionInterval);
            pendingInjectionInterval = null;

            set_hotkeys();

            function processSkillNode(skillNode) {
                const skillNodes = [...skillNode?.querySelector("div")?.children || []];
                
                skillNodes.forEach(skill_node => {
                    const skill_metadata = window.ru.ReactFiber(skill_node)?.child?.memoizedProps?.level;
                    if (!skill_metadata) return;

                    const unlocked = skill_metadata.state !== "locked";
                    const legendary_level_unlocked = skill_metadata.state === "passed";
                    const shouldShowStartButton = (
                        skill_metadata.type === "story"
                        || !legendary_level_unlocked
                        || (legendary_level_unlocked && skill_metadata.hasLevelReview)
                    );
                    const shouldShowLegendaryButton = legendary_level_unlocked;
                    const desiredButtonState = !unlocked || skill_metadata.type === "chest"
                        ? "hidden"
                        : `${shouldShowStartButton ? "start" : ""}${shouldShowStartButton && shouldShowLegendaryButton ? "+" : ""}${shouldShowLegendaryButton ? "legendary" : ""}`;
                    const existingContainer = skill_node.querySelector(".start-autolingo-skill-container");

                    if (desiredButtonState === "hidden") {
                        existingContainer?.remove();
                        return;
                    }

                    if (existingContainer?.dataset.buttonState === desiredButtonState) {
                        return;
                    }

                    existingContainer?.remove();

                    if (unlocked && skill_metadata.type !== "chest") {
                        let autolingo_skill_container = document.createElement("DIV");
                        autolingo_skill_container.className = "start-autolingo-skill-container";
                        autolingo_skill_container.dataset.buttonState = desiredButtonState;
                        
                        skill_node.appendChild(autolingo_skill_container);

                        const lessonType = skill_metadata.type === "story" ? "story" : "lesson";

                        if (shouldShowStartButton) {
                            let start_autolingo_skill_tooltip = document.createElement("DIV");
                            start_autolingo_skill_tooltip.className = "tooltip";

                            let start_autolingo_skill = document.createElement("IMG");
                            start_autolingo_skill.src = tier_img_url
                            start_autolingo_skill.className = "start-autolingo-skill";
    
                            start_autolingo_skill.onclick = () => {
                                let ds = new DuolingoSkill(skill_node, lessonType);
                                ds.start('[data-test*="skill-path-state"]', false);
                            };
    
                            let start_autolingo_tooltip_text = document.createElement("SPAN");
                            start_autolingo_tooltip_text.innerHTML = `Autocomplete <strong>${skill_metadata.type}</strong> with AutoLingo.`;
                            start_autolingo_tooltip_text.className = "tooltip-text";
    
                            start_autolingo_skill_tooltip.appendChild(start_autolingo_tooltip_text);
                            start_autolingo_skill_tooltip.appendChild(start_autolingo_skill);
                            autolingo_skill_container.appendChild(start_autolingo_skill_tooltip);
                        }

                        if (shouldShowLegendaryButton) {
                            let final_autolingo_skill_tooltip = document.createElement("DIV");
                            final_autolingo_skill_tooltip.className = "tooltip";
    
                            let final_autolingo_skill = document.createElement("IMG");
                            final_autolingo_skill.src = legendary_img_url;
                            final_autolingo_skill.className = "final-autolingo-skill";
    
                            final_autolingo_skill.onclick = () => {
                                let ds = new DuolingoSkill(skill_node, lessonType);
                                ds.start('[data-test="legendary-node-button"]', true);                            
                            }
    
                            let final_autolingo_tooltip_text = document.createElement("SPAN");
                            final_autolingo_tooltip_text.innerHTML = `Autocomplete <strong>legendary ${skill_metadata.type}</strong> with AutoLingo.`;
                            final_autolingo_tooltip_text.className = "tooltip-text";
    
                            final_autolingo_skill_tooltip.appendChild(final_autolingo_tooltip_text);
                            final_autolingo_skill_tooltip.appendChild(final_autolingo_skill);
                            autolingo_skill_container.appendChild(final_autolingo_skill_tooltip);
                        }
                    }
                });
            }

            Array.from(targetNode.querySelectorAll('[data-test*="skill-path-unit"]')).forEach(e => {
                processSkillNode(e);
            });

            const processAffectedSkillUnits = (node) => {
                if (!(node instanceof Element)) return;

                const skillPathUnit = node.matches('[data-test*="skill-path-unit"]')
                    ? node
                    : node.closest('[data-test*="skill-path-unit"]');
                if (skillPathUnit) {
                    processSkillNode(skillPathUnit);
                }

                node.querySelectorAll?.('[data-test*="skill-path-unit"]').forEach(processSkillNode);
            };

            currentObserver = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            processAffectedSkillUnits(node);
                        });
                    }
                }
            });

            const config = { childList: true, subtree: true };
            currentObserver.observe(targetNode, config);
            
            isAutolingoInjected = true;
        }
    }, 100)
}

const remove_autolingo = () => {
    if (currentObserver) {
        currentObserver.disconnect();
        currentObserver = null;
    }
    
    if (pendingInjectionInterval) {
        clearInterval(pendingInjectionInterval);
        pendingInjectionInterval = null;
    }
    
    document.querySelectorAll('.start-autolingo-skill-container').forEach(el => {
        el.remove();
    });
    isAutolingoInjected = false;
}

let hotkeysSet = false;

const set_hotkeys = () => {
    if (hotkeysSet) return;
    hotkeysSet = true;
    
    document.addEventListener("keydown", e => {
        if (e.key === "Enter" && e.ctrlKey) {
            const challenge = new DuolingoChallenge();
            challenge.solve().then(() => {
                challenge.click_next();
                window.autolingo.solving = false;
            }).catch(error => {
                console.error(error);
            });
        }

        if (e.key === "Enter" && e.altKey) {
            const challenge = new DuolingoChallenge();
            challenge.solve().then(() => {
                window.autolingo.solving = false;
            }).catch(error => {
                console.error(error);
            });
        }

        if (e.key === "s" && e.altKey) {
            document.querySelector("[data-test='player-skip']")?.click();
        }
    });
}

document.addEventListener("extension_id", e => {
    const extension_id = `chrome-extension://${e.detail.data}`;
    inject(extension_id);
});

document.addEventListener("set_icon_assets", e => {
    tier_img_url = e.detail.data.tierIconUrl;
    legendary_img_url = e.detail.data.legendaryIconUrl;

    if (isAutomationEnabled) {
        inject_autolingo();
    }
});

document.addEventListener("set_initial_state", e => {
    const { isEnabled, delay } = e.detail.data;
    window.log("Initial state received:", { isEnabled, delay });
    
    isAutomationEnabled = Boolean(isEnabled);
    window.autolingo_delay = delay;
    
    set_hotkeys();
    
    if (isAutomationEnabled) {
        inject_autolingo();
    }
});

document.addEventListener("enable_automation", () => {
    window.log("Enabling automation");
    isAutomationEnabled = true;
    if (!isAutolingoInjected) {
        inject_autolingo();
    }
});

document.addEventListener("disable_automation", () => {
    window.log("Disabling automation");
    isAutomationEnabled = false;
    if (isAutolingoInjected) {
        remove_autolingo();
    }
});

window.dispatchEvent(
    new CustomEvent("get_extension_id", { detail: null })
);

document.addEventListener("set_delay", (e) => {
    window.autolingo_delay = e.detail.data;
});

