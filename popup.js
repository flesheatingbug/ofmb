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

// use sync storage where it works, otherwise local storage (some browsers have no sync area)
let area = chrome.storage.sync || chrome.storage.local;
function withArea(fn) {
  try { fn(area); } catch (e) { if (area !== chrome.storage.local) { area = chrome.storage.local; fn(area); } else throw e; }
}

withArea((st) => st.get(
  { enabled: true, mode: "replace", rulesText: DEFAULT_RULES },
  (cfg) => {
    enabledEl.checked = cfg.enabled;
    rulesEl.value = cfg.rulesText || DEFAULT_RULES;
    const mode = cfg.mode === "hide" ? "hide" : "replace";
    radios.forEach((r) => (r.checked = r.value === mode));
  }
));

document.getElementById("save").addEventListener("click", () => {
  const data = { enabled: enabledEl.checked, mode: currentMode(), rulesText: rulesEl.value };
  const done = () => { try { area.remove(["customName", "custom"]); } catch (e) { /* old settings */ } flash("Saved"); };
  // the content script reads sync first, then local: keep both in step
  try { chrome.storage.local.set(data); } catch (e) { /* ignore */ }
  withArea((st) => st.set(data, done));
});

document.getElementById("reset").addEventListener("click", () => {
  rulesEl.value = DEFAULT_RULES;
  flash("Reset (press Save)");
});
