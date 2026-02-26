/* Marklet — Background Service Worker */

/* ----- Migration on install / update ------------------------------------ */
chrome.runtime.onInstalled.addListener(async () => {
    try {
        // Ensure Utils is available for migration
        await ensureRootFolder();
        await migrateOldData();
    } catch (e) {
        console.warn('Marklet: migration skipped', e);
    }
});

/* ----- Ensure root "Marklet" folder exists ------------------------------ */
async function ensureRootFolder() {
    const children = await chrome.bookmarks.getChildren('1');
    if (!children.find(n => !n.url && n.title === 'Marklet')) {
        await chrome.bookmarks.create({ parentId: '1', title: 'Marklet' });
    }
}

/* ----- Migrate old chrome.storage.local data to actual bookmarks -------- */
async function migrateOldData() {
    const r = await chrome.storage.local.get(['markletData', 'markletMigrated']);
    if (r.markletMigrated || !r.markletData) return;
    const data = r.markletData;
    if (!data.bookmarklets || data.bookmarklets.length === 0) {
        await chrome.storage.local.set({ markletMigrated: true });
        return;
    }

    const barChildren = await chrome.bookmarks.getChildren('1');
    let rootFolder = barChildren.find(n => !n.url && n.title === 'Marklet');
    if (!rootFolder) {
        rootFolder = await chrome.bookmarks.create({ parentId: '1', title: 'Marklet' });
    }
    const rootId = rootFolder.id;

    // Create category sub-folders
    const catMap = {}; // name → folderId
    for (const cat of (data.categories || [])) {
        if (cat === 'Uncategorized') { catMap[cat] = rootId; continue; }
        const created = await chrome.bookmarks.create({ parentId: rootId, title: cat });
        catMap[cat] = created.id;
    }

    const meta = {};
    for (const bm of data.bookmarklets) {
        const parentId = catMap[bm.category] || rootId;
        let url = (bm.code || '').trim();
        if (!url.startsWith('javascript:')) {
            // Smoosh into one line (simple — just join + collapse)
            url = 'javascript:' + url
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '')
                .replace(/\n/g, ' ')
                .replace(/  +/g, ' ')
                .trim();
        }
        if (!url || url === 'javascript:') url = 'javascript:void(0)';

        const bk = await chrome.bookmarks.create({
            parentId,
            title: bm.name || 'Untitled',
            url
        });

        meta[bk.id] = {
            description: bm.description || '',
            tags: bm.tags || [],
            favicon: bm.favicon || { type: 'emoji', value: '⚡' },
            runCount: bm.runCount || 0,
            lastRunAt: bm.lastRunAt || null,
            createdAt: bm.createdAt || new Date().toISOString(),
            updatedAt: bm.updatedAt || new Date().toISOString(),
            order: bm.order || 0
        };
    }

    await chrome.storage.local.set({ markletMeta: meta, markletMigrated: true });
    await chrome.storage.local.remove('markletData');
    console.log('Marklet: migrated', data.bookmarklets.length, 'bookmarklets to Chrome bookmarks');
}

/* ----- Message handler -------------------------------------------------- */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'runBookmarklet') {
        executeBookmarklet(message.code, message.id);
        sendResponse({ success: true });
    }
    if (message.action === 'openManager') {
        chrome.tabs.create({ url: chrome.runtime.getURL('manager/manager.html') });
        sendResponse({ success: true });
    }
    return true;
});

/* ----- Execute a bookmarklet on the active tab -------------------------- */
async function executeBookmarklet(code, id) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        let execCode = code.trim();
        if (execCode.startsWith('javascript:')) execCode = execCode.slice(11);

        // Inject via blob URL — bypasses CSP on most sites (unlike new Function).
        // If the page has a very strict CSP that blocks blob: scripts too,
        // the user should click the bookmark directly from the bookmarks bar.
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (codeStr) => {
                try {
                    const blob = new Blob([codeStr], { type: 'text/javascript' });
                    const url = URL.createObjectURL(blob);
                    const s = document.createElement('script');
                    s.src = url;
                    s.onload = () => { URL.revokeObjectURL(url); s.remove(); };
                    s.onerror = () => {
                        URL.revokeObjectURL(url);
                        s.remove();
                        // Last resort: try direct eval (will only work if CSP allows unsafe-eval)
                        try { (0, eval)(codeStr); } catch (e) {
                            console.warn('Marklet: CSP blocked execution. Click the bookmark directly from your bookmarks bar instead.');
                        }
                    };
                    (document.head || document.documentElement).appendChild(s);
                } catch (e) {
                    console.error('Marklet: execution error', e);
                }
            },
            args: [execCode],
            world: 'MAIN'
        });

        // Track run count
        if (id) {
            const r = await chrome.storage.local.get('markletMeta');
            const meta = r.markletMeta || {};
            if (meta[id]) {
                meta[id].runCount = (meta[id].runCount || 0) + 1;
                meta[id].lastRunAt = new Date().toISOString();
                await chrome.storage.local.set({ markletMeta: meta });
            }
        }
    } catch (err) {
        console.error('Marklet: Failed to execute bookmarklet', err);
    }
}
