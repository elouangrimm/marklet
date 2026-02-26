# ⚡ Marklet

A powerful bookmarklet manager Chrome extension with a syntax-highlighted code editor, custom favicons, categories, and one-click execution.

## Features

- **Code Editor** — JavaScript syntax highlighting, line numbers, auto-indent, bracket matching, tab support
- **Custom Favicons** — Emoji picker, image URL, or file upload for each bookmarklet
- **Categories & Tags** — Organize bookmarklets into collapsible categories with flexible tags
- **One-Click Run** — Execute any bookmarklet on the current tab from the popup or manager
- **Search & Filter** — Quickly find bookmarklets by name, description, or tags
- **Drag & Drop Reorder** — Reorder bookmarklets in the sidebar by dragging
- **Import / Export** — Backup and restore all bookmarklets as JSON
- **Code Tools** — Format (beautify), minify, wrap in IIFE, and copy bookmarklet URL
- **Auto-Save** — Changes are saved automatically as you type
- **Usage Tracking** — See how many times each bookmarklet has been run
- **Keyboard Shortcuts** — `Ctrl+S` to save, `Ctrl+N` for new bookmarklet, `Esc` to close modals
- **Dark Theme** — Styled with the [e5g.dev/css](https://e5g.dev/css) design system

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the `marklet` folder
5. The ⚡ Marklet icon will appear in your toolbar

## Usage

- Click the **⚡ Marklet** icon in the toolbar to open the popup — search and run bookmarklets with one click
- Click the **≡** button in the popup (or right-click the extension icon → Options) to open the full **Manager**
- In the Manager, click **+ New Bookmarklet** to create a new entry
- Write or paste JavaScript code in the editor with full syntax highlighting
- Click the favicon to customize the icon with an emoji, image URL, or uploaded file
- Use the toolbar buttons to **Format**, **Minify**, or **Wrap in IIFE**
- Click **▶ Run on Tab** to execute the bookmarklet on the current page
- Click **Copy URL** to copy the `javascript:` URL for use as a browser bookmark

## File Structure

```
marklet/
├── manifest.json          Chrome Extension manifest (V3)
├── background.js          Service worker for bookmarklet execution
├── popup/
│   ├── popup.html         Quick-access popup
│   ├── popup.css          Popup styles
│   └── popup.js           Popup logic
├── manager/
│   ├── manager.html       Full manager page
│   ├── manager.css        Manager styles
│   └── manager.js         Manager logic (CRUD, editor, modals)
├── shared/
│   ├── storage.js         Storage abstraction (chrome.storage)
│   ├── highlighter.js     JavaScript syntax highlighter
│   └── utils.js           Utility functions
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```
