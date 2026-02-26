/* Marklet Popup Logic */

document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('bookmarkletList');
    const searchInput = document.getElementById('searchInput');
    const countLabel = document.getElementById('countLabel');
    const openManagerBtn = document.getElementById('openManager');
    const emptyOpenManagerBtn = document.getElementById('emptyOpenManager');

    let allBookmarklets = [];

    async function load() {
        allBookmarklets = await Storage.getBookmarklets();
        allBookmarklets.sort((a, b) => (a.order || 0) - (b.order || 0));
        render(allBookmarklets);
    }

    function render(bookmarklets) {
        countLabel.textContent = allBookmarklets.length + ' bookmarklet' + (allBookmarklets.length !== 1 ? 's' : '');

        if (bookmarklets.length === 0 && allBookmarklets.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">No bookmarklets yet.</p>
                    <button class="btn-link" id="emptyOpenManager2">Open Manager to add some</button>
                </div>`;
            const btn = document.getElementById('emptyOpenManager2');
            if (btn) btn.addEventListener('click', openManager);
            return;
        }

        if (bookmarklets.length === 0) {
            listEl.innerHTML = '<div class="empty-state"><p class="text-muted">No matches found.</p></div>';
            return;
        }

        listEl.innerHTML = bookmarklets.map(bm => {
            const favicon = renderFavicon(bm.favicon);
            const desc = bm.description ? Utils.escapeHtml(bm.description) : '';
            const name = Utils.escapeHtml(bm.name);
            const cat = bm.category && bm.category !== 'Uncategorized'
                ? `<span class="bm-category-badge">${Utils.escapeHtml(bm.category)}</span>` : '';
            const runs = bm.runCount ? `<span class="bm-run-count">×${bm.runCount}</span>` : '';

            return `
                <div class="bm-item" data-id="${bm.id}" title="Click to run: ${name}">
                    <div class="bm-favicon">${favicon}</div>
                    <div class="bm-info">
                        <div class="bm-name">${name}</div>
                        ${desc ? `<div class="bm-desc">${desc}</div>` : ''}
                    </div>
                    ${cat}
                    ${runs}
                </div>`;
        }).join('');

        listEl.querySelectorAll('.bm-item').forEach(item => {
            item.addEventListener('click', () => runBookmarklet(item.dataset.id));
        });
    }

    function renderFavicon(favicon) {
        if (!favicon) return '⚡';
        if (favicon.type === 'emoji') return favicon.value || '⚡';
        if (favicon.type === 'url' || favicon.type === 'data') {
            return `<img src="${Utils.escapeHtml(favicon.value)}" alt="">`;
        }
        return '⚡';
    }

    async function runBookmarklet(id) {
        const bm = allBookmarklets.find(b => b.id === id);
        if (!bm) return;

        chrome.runtime.sendMessage({
            action: 'runBookmarklet',
            code: bm.code,
            id: bm.id
        });

        const item = listEl.querySelector(`[data-id="${id}"]`);
        if (item) {
            item.style.backgroundColor = 'var(--bg-surface)';
            setTimeout(() => {
                item.style.backgroundColor = '';
            }, 200);
        }

        setTimeout(() => window.close(), 150);
    }

    function openManager() {
        chrome.runtime.sendMessage({ action: 'openManager' });
        window.close();
    }

    searchInput.addEventListener('input', Utils.debounce(() => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
            render(allBookmarklets);
            return;
        }
        const filtered = allBookmarklets.filter(bm =>
            bm.name.toLowerCase().includes(query) ||
            (bm.description && bm.description.toLowerCase().includes(query)) ||
            (bm.category && bm.category.toLowerCase().includes(query)) ||
            (bm.tags && bm.tags.some(t => t.toLowerCase().includes(query)))
        );
        render(filtered);
    }, 150));

    openManagerBtn.addEventListener('click', openManager);
    if (emptyOpenManagerBtn) emptyOpenManagerBtn.addEventListener('click', openManager);

    searchInput.focus();
    await load();
});
