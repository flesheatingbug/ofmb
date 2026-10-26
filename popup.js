const DEFAULT_RULES = [
  "Donald J. Trump => orange fat man baby",
  "Donald Trump => orange fat man baby",
  "President Trump => orange fat man baby",
  "Trump => orange fat man baby"
].join("\n");

const enabledEl = document.getElementById("enabled");
const rulesEl = document.getElementById("rules");
const statusEl = document.getElementById("status");
const radios = Array.from(document.querySelectorAll("input[name=mode]"));

function currentMode() {
  return radios.find((r) => r.checked).value;
}

function flash(msg) {
  statusEl.textContent = msg;
  setTimeout(() => (statusEl.textContent = ""), 1500);
}

chrome.storage.sync.get(
  { enabled: true, mode: "replace", rulesText: DEFAULT_RULES },
  (cfg) => {
    enabledEl.checked = cfg.enabled;
    rulesEl.value = cfg.rulesText || DEFAULT_RULES;
    const mode = cfg.mode === "hide" ? "hide" : "replace";
    radios.forEach((r) => (r.checked = r.value === mode));
  }
);

document.getElementById("save").addEventListener("click", () => {
  chrome.storage.sync.set(
    { enabled: enabledEl.checked, mode: currentMode(), rulesText: rulesEl.value },
    () => {
      chrome.storage.sync.remove(["customName", "custom"]);   // old settings
      flash("Saved");
    }
  );
});

document.getElementById("reset").addEventListener("click", () => {
  rulesEl.value = DEFAULT_RULES;
  flash("Reset (press Save)");
});
