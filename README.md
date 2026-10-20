A tiny browser extension that hides or rewrites "Trump says"-style headlines on any website.

Tired of the same name leading every feed? OFMB scans the pages you browse for headlines like "Trump says…", "Trump said…", "President Trump claims…" and either makes them disappear or rewrites them to something more entertaining. It works on Reddit, Google search and news results, and anywhere else.

Features
Three modes, switchable from the toolbar popup:
Hide the post. The whole card, post or search result vanishes.
Replace with "orange fat man baby". "Trump says tariffs are coming" becomes "orange fat man baby says tariffs are coming".
Replace with your own text. Type whatever you like.
Smart matching. Catches "Trump", "President Trump", "Donald Trump" and "Trump's" followed by verbs like says, said, claims, told, warns, slams, announces, and more.
Custom phrases. In hide mode, add your own phrases to block, one per line.
Works on dynamic pages. Infinite scroll and live-updating feeds are handled, and the tab title is rewritten too.
Instant undo. Switch modes or turn it off and the page returns to normal without a reload.
Private. No tracking, no analytics, no network requests. Settings are stored in your browser's own extension storage.
Install

OFMB is a Manifest V3 extension and works in Chrome, Chromium, Brave, Edge, and other Chromium-based browsers.

Download or clone this repo.
Open chrome://extensions (or edge://extensions, brave://extensions).
Turn on Developer mode.
Click Load unpacked and select this folder.
Pin the OFMB icon to your toolbar and pick your mode.
Usage

Click the toolbar icon to:

Option	What it does
Filter enabled	Master on/off switch
Hide the post	Hides matching posts, articles and results (plus any extra phrases you add)
Replace with "orange fat man baby"	Swaps the name for the default phrase
Replace with my own text	Swaps the name for your text

Press Save and the change applies to open tabs right away.

Customizing
Change the default phrase: edit PRESET_NAME near the top of content.js, and update the label in popup.html.
Add or remove trigger verbs: edit the VERBS list at the top of content.js.
Add support for more site layouts: add selectors to CONTAINER_SELECTOR in content.js.
How it works

A content script walks the page's text nodes looking for the pattern Trump + verb. In hide mode it finds the nearest card-like container (an article, a Reddit post, a Google result, and so on) and sets it to display: none. In replace mode it rewrites only the name and leaves the rest of the headline intact. A MutationObserver re-checks content as it loads.

Known limitations
Replacement only works when the name and verb sit in the same piece of text. If a site splits them across elements, such as <a>Trump</a> says, it won't catch it.
Hide mode relies on page structure. Reddit and Google change their markup often, so selectors may need updating. When no known container matches, a fallback guesses the card boundary and can occasionally hide slightly too much or too little.
Text inside images, such as thumbnails and memes, can't be filtered.
Hide mode only looks at headline-length text, so long comments or article bodies that mention the phrase are left alone.
Contributing

Issues and pull requests are welcome, especially selector updates for sites that aren't handled well.
