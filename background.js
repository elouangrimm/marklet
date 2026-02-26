/* Marklet — Background Service Worker */

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

async function executeBookmarklet(code, id) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        let execCode = code.trim();
        if (execCode.startsWith('javascript:')) {
            execCode = execCode.slice(11);
        }

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (codeStr) => {
                const fn = new Function(codeStr);
                fn();
            },
            args: [execCode],
            world: 'MAIN'
        });

        if (id) {
            const result = await chrome.storage.local.get('markletData');
            const data = result.markletData;
            if (data) {
                const bm = data.bookmarklets.find(b => b.id === id);
                if (bm) {
                    bm.runCount = (bm.runCount || 0) + 1;
                    bm.lastRunAt = new Date().toISOString();
                    await chrome.storage.local.set({ markletData: data });
                }
            }
        }
    } catch (err) {
        console.error('Marklet: Failed to execute bookmarklet', err);
    }
}
