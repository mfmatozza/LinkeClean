# Feed Cleaner for LinkedIn

A Chrome extension that filters noise from your LinkedIn feed so you can focus on posts that actually matter.

![Chrome Web Store] **NOT APPROVEED YET**

---

## What it does

LinkedIn feeds are full of clutter — promoted posts, work anniversaries, "X liked this" notifications, polls nobody asked for, and algorithmic suggestions. Feed Cleaner removes all of that in real time as you scroll.

Everything is toggleable from the popup. You decide what stays and what goes.

## Filters

| Filter | Description |
|---|---|
| Ads | Banner ads and ad containers |
| Promoted posts | Sponsored / promoted content |
| Suggested posts | Algorithmic recommendations |
| Follow suggestions & upsells | "People you may know" and Premium prompts |
| Work anniversaries | "Celebrating X years at…" |
| Celebrations & new jobs | "Excited to announce…", "Started a new position" |
| Liked / commented by others | "X liked this", "X commented on this" |
| Polls | Inline polls |
| Newsletters | "Published a newsletter" |
| Events | Event promotions and RSVPs |
| Group posts | Posts from LinkedIn groups |

## Install

### From the Chrome Web Store

Coming soon.

### Manual install (developer mode)

1. Clone this repo or download the ZIP
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the project folder (the one containing `manifest.json`)
6. Open LinkedIn and browse — the extension is active immediately

## Usage

Click the extension icon in your toolbar to open the popup. Toggle filters on or off. Changes apply on the next scroll — no reload needed.

Your preferences are saved via `chrome.storage.sync` and will persist across sessions and sync across your Chrome devices.

## Project structure

```
├── manifest.json       # Extension manifest (v3)
├── content.js          # Content script — runs on linkedin.com, filters posts
├── styles.css          # Minimal CSS for hiding filtered elements
├── popup.html          # Popup UI
├── popup.js            # Popup logic and filter state management
├── icon48.png          # Toolbar icon
└── icon128.png         # Store icon
```

## How it works

The extension injects a content script into `linkedin.com` that:

1. Scans feed posts using DOM selectors and text pattern matching
2. Checks each post against the user's active filters (promoted labels, keyword patterns, element classes)
3. Hides matching posts by setting `display: none`
4. Uses a `MutationObserver` to catch new posts loaded via infinite scroll
5. Runs a periodic fallback check every 2 seconds

No data leaves your browser. No external API calls. No analytics.

## Privacy

- **No data collection** - the extension does not collect, store, or transmit any personal data
- **No tracking** — no analytics, no cookies, no third-party services
- **Local only** — filter preferences are stored in `chrome.storage.sync` (your browser) and nothing else
- **Minimal permissions** — host access to `www.linkedin.com` (to run the content script) and `storage` (to save preferences)

## Limitations

- LinkedIn frequently updates their DOM structure and CSS class names. If the extension stops catching certain post types, the selectors may need updating.
- The extension relies on text pattern matching for some filters (anniversaries, celebrations), which may not catch every variation or every language.
- Currently supports English and Italian patterns.

## Contributing

Found a post type that's not being caught? Open an issue with a screenshot or description of what slipped through. PRs are welcome — especially for adding patterns in other languages.

