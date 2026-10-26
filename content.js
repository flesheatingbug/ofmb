(() => {
  // One rule per line:  Name => replacement
  // A line with just a name has no replacement (used only in hide mode).
  const DEFAULT_RULES = [
    "Donald J. Trump => orange fat man baby",
    "Donald Trump => orange fat man baby",
    "President Trump => orange fat man baby",
    "Trump => orange fat man baby"
  ].join("\n");

  const CONTAINER_SELECTOR = [
    "article", "[role='article']", "shreddit-post", ".thing",
    "div.MjjYud", "div.g", "g-card", "div.SoaBEf",
    "li.story", ".story", ".card", ".search-result", ".post", ".feed-item",
    "li"
  ].join(",");

  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT",
    "CODE", "PRE", "TITLE", "HEAD"
  ]);
  const MAX_TEXT_LEN = 250;       // hide mode only looks at headline-length text
  const MAX_CONTAINER_TEXT = 3000;
  const HIDDEN_ATTR = "data-hf-hidden";

  let enabled = true;
  let mode = "replace";           // "hide" | "replace"
  let rulesText = DEFAULT_RULES;

  let allRe = null;               // every name (hide mode)
  let replRe = null;              // names that have a replacement
  const allMap = new Map();       // normalized name -> rule
  const replMap = new Map();

  // node -> { orig, written } for text we replaced, so we can undo it
  const replaced = new Map();
  let origTitle = null;
  let writtenTitle = null;

  /* ---------------- RULES ---------------- */

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function norm(s) {
    return s.trim().replace(/\s+/g, " ").toLowerCase();
  }

  function parseRules(text) {
    const rules = [];
    text.split("\n").forEach((line) => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      const i = line.indexOf("=>");
      let name = line, rep = "";
      if (i >= 0) {
        name = line.slice(0, i).trim();
        rep = line.slice(i + 2).trim();
      }
      if (name) rules.push({ name, rep });
    });
    return rules;
  }

  function buildRegex(names) {
    if (!names.length) return null;
    const parts = names
      .slice()
      .sort((a, b) => b.length - a.length)         // longest first
      .map((n) => n.trim().split(/\s+/).map(escapeRe).join("\\s+"));
    return new RegExp(
      "(?<![\\p{L}\\p{N}_])(?:" + parts.join("|") + ")(?![\\p{L}\\p{N}_])",
      "giu"
    );
  }

  function buildAll() {
    allMap.clear();
    replMap.clear();
    const allNames = [], replNames = [];
    parseRules(rulesText).forEach((r) => {
      const k = norm(r.name);
      if (!allMap.has(k)) { allMap.set(k, r); allNames.push(r.name); }
      if (r.rep && !replMap.has(k)) { replMap.set(k, r); replNames.push(r.name); }
    });
    allRe = buildRegex(allNames);
    replRe = buildRegex(replNames);
  }

  // If the rule name starts with a capital, a lowercase match
  // (e.g. "trump card") is ignored. ALL CAPS and Title Case still match.
  function caseOk(matched, name) {
    const f = name.charAt(0);
    if (f !== f.toLowerCase()) {
      const c = matched.charAt(0);
      return c !== c.toLowerCase();
    }
    return true;
  }

  function loadSettings(cb) {
    chrome.storage.sync.get(
      { enabled: true, mode: "replace", rulesText: DEFAULT_RULES },
      (cfg) => {
        enabled = cfg.enabled;
        mode = cfg.mode === "hide" ? "hide" : "replace";
        rulesText = cfg.rulesText || DEFAULT_RULES;
        buildAll();
        cb && cb();
      }
    );
  }

  function hasHit(text) {
    if (!allRe || !text) return false;
    allRe.lastIndex = 0;
    let m;
    while ((m = allRe.exec(text))) {
      const r = allMap.get(norm(m[0]));
      if (r && caseOk(m[0], r.name)) return true;
      if (m[0].length === 0) allRe.lastIndex++;
    }
    return false;
  }

  function matches(text) {
    if (!text || text.length > MAX_TEXT_LEN) return false;
    return hasHit(text);
  }

  function isEditable(el) {
    return el.isContentEditable || SKIP_TAGS.has(el.tagName);
  }

  /* ---------------- HIDE MODE ---------------- */

  function findTarget(textNode) {
    const start = textNode.parentElement;
    if (!start || isEditable(start)) return null;

    let container = start.closest(CONTAINER_SELECTOR);
    while (container && container.parentElement) {
      const outer = container.parentElement.closest(CONTAINER_SELECTOR);
      if (
        outer &&
        outer !== document.body &&
        outer.textContent.length < MAX_CONTAINER_TEXT &&
        outer.querySelectorAll("a").length < 12
      ) {
        container = outer;
      } else break;
    }
    if (
      container &&
      container !== document.body &&
      container !== document.documentElement &&
      container.tagName !== "MAIN" &&
      container.textContent.length < MAX_CONTAINER_TEXT
    ) {
      return container;
    }

    let el = start;
    let best = start;
    for (let i = 0; i < 4 && el.parentElement; i++) {
      el = el.parentElement;
      if (el === document.body || el.tagName === "MAIN" || el.textContent.length > 400) break;
      best = el;
    }
    return best === document.body ? null : best;
  }

  function hide(el) {
    if (el.hasAttribute(HIDDEN_ATTR)) return;
    el.setAttribute(HIDDEN_ATTR, "1");
    el.setAttribute("data-hf-prev", el.style.display || "");
    el.style.setProperty("display", "none", "important");
  }

  function unhideAll() {
    document.querySelectorAll("[" + HIDDEN_ATTR + "]").forEach((el) => {
      el.style.removeProperty("display");
      const prev = el.getAttribute("data-hf-prev");
      if (prev) el.style.display = prev;
      el.removeAttribute(HIDDEN_ATTR);
      el.removeAttribute("data-hf-prev");
    });
  }

  function scanHide(root) {
    if (root.nodeType === 1) {
      const posts = root.matches && root.matches("shreddit-post")
        ? [root]
        : Array.from(root.querySelectorAll ? root.querySelectorAll("shreddit-post") : []);
      posts.forEach((p) => {
        if (matches(p.getAttribute("post-title"))) hide(p);
      });
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || SKIP_TAGS.has(p.tagName) || p.closest("[" + HIDDEN_ATTR + "]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const hits = [];
    let node;
    while ((node = walker.nextNode())) {
      if (matches(node.nodeValue)) hits.push(node);
    }
    hits.forEach((n) => {
      const target = findTarget(n);
      if (target) hide(target);
    });
  }

  /* ---------------- REPLACE MODE ---------------- */

  function applyCase(name, offset, str) {
    // Capitalise the first letter at the start of a sentence/headline
    const before = str.slice(0, offset).replace(/\s+$/, "");
    const atStart = before === "" || /[.!?:"\u201C\u2018(\[]$/.test(before);
    return atStart ? name.charAt(0).toUpperCase() + name.slice(1) : name;
  }

  function replaceText(orig) {
    if (!replRe) return orig;
    return orig.replace(replRe, (m, offset, str) => {
      const r = replMap.get(norm(m));
      if (!r || !caseOk(m, r.name)) return m;
      if (m.length > 1 && m === m.toUpperCase() && m !== m.toLowerCase()) {
        return r.rep.toUpperCase();            // TRUMP -> ALL CAPS replacement
      }
      return applyCase(r.rep, offset, str);
    });
  }

  function scanReplace(root) {
    if (!replRe) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || isEditable(p)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    while ((node = walker.nextNode())) {
      const val = node.nodeValue;
      if (!val || val.length < 2) continue;
      const prev = replaced.get(node);
      if (prev && prev.written === val) continue;      // our own change
      const next = replaceText(val);
      if (next !== val) {
        replaced.set(node, { orig: val, written: next });
        node.nodeValue = next;
      }
    }

    // Tab title
    if (root === document.body || root.nodeType === 9) {
      const t = document.title;
      if (t && t !== writtenTitle) {
        const nt = replaceText(t);
        if (nt !== t) {
          origTitle = t;
          writtenTitle = nt;
          document.title = nt;
        }
      }
    }
  }

  function restoreReplaced() {
    replaced.forEach((s, node) => {
      if (node.isConnected && node.nodeValue === s.written) node.nodeValue = s.orig;
    });
    replaced.clear();
    if (writtenTitle !== null && document.title === writtenTitle) {
      document.title = origTitle;
    }
    origTitle = null;
    writtenTitle = null;
  }

  function pruneReplaced() {
    replaced.forEach((_, node) => {
      if (!node.isConnected) replaced.delete(node);
    });
  }

  /* ---------------- DISPATCH ---------------- */

  function scan(root) {
    if (!enabled || !root) return;
    if (mode === "hide") scanHide(root);
    else scanReplace(root);
  }

  function resetAll() {
    unhideAll();
    restoreReplaced();
  }

  const pending = new Set();
  let timer = null;
  function queue(node) {
    pending.add(node);
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      const nodes = Array.from(pending);
      pending.clear();
      nodes.forEach((n) => {
        if (n.isConnected) scan(n.nodeType === 3 ? n.parentElement : n);
      });
      if (replaced.size > 5000) pruneReplaced();
    }, 150);
  }

  const observer = new MutationObserver((mutations) => {
    if (!enabled) return;
    for (const m of mutations) {
      if (m.type === "childList") {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1 || n.nodeType === 3) queue(n);
        });
      } else if (m.type === "characterData") {
        queue(m.target);
      }
    }
  });

  chrome.storage.onChanged.addListener(() => {
    loadSettings(() => {
      resetAll();
      if (enabled) scan(document.body);
    });
  });

  loadSettings(() => {
    scan(document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
})();
