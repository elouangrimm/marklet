/* Shared storage abstraction for Marklet — Chrome Bookmarks API backend
 *
 * Bookmarklets are stored as ACTUAL Chrome bookmarks inside a "Marklet" folder
 * in the Bookmarks Bar.  Categories become sub-folders.  Metadata (description,
 * tags, favicon, run stats) lives in chrome.storage.local keyed by bookmark id.
 */

const MARKLET_FOLDER = 'Marklet';
const BOOKMARKS_BAR_ID = '1'; // Chrome's bookmarks bar node id

const DEFAULT_SETTINGS = {
    theme: 'dark',
    defaultCategory: 'Uncategorized',
    editorFontSize: 14,
    editorTabSize: 2
};

const Storage = {
    _rootId: null,

    /* ==================================================================
       INTERNAL — Folder helpers
       ================================================================== */

    async _ensureRootFolder() {
        if (this._rootId) {
            try { await chrome.bookmarks.get(this._rootId); return this._rootId; }
            catch { this._rootId = null; }
        }
        const children = await chrome.bookmarks.getChildren(BOOKMARKS_BAR_ID);
        const existing = children.find(n => !n.url && n.title === MARKLET_FOLDER);
        if (existing) { this._rootId = existing.id; return this._rootId; }

        const created = await chrome.bookmarks.create({
            parentId: BOOKMARKS_BAR_ID,
            title: MARKLET_FOLDER
        });
        this._rootId = created.id;
        return this._rootId;
    },

    async _getCategoryFolderId(category) {
        const rootId = await this._ensureRootFolder();
        if (!category || category === 'Uncategorized') return rootId;

        const children = await chrome.bookmarks.getChildren(rootId);
        const folder = children.find(c => !c.url && c.title === category);
        if (folder) return folder.id;

        const created = await chrome.bookmarks.create({ parentId: rootId, title: category });
        return created.id;
    },

    async _bookmarkExists(id) {
        try { await chrome.bookmarks.get(id); return true; }
        catch { return false; }
    },

    /* ==================================================================
       INTERNAL — Metadata (chrome.storage.local)
       ================================================================== */

    async _getAllMeta() {
        const r = await chrome.storage.local.get('markletMeta');
        return r.markletMeta || {};
    },

    async _saveMeta(id, meta) {
        const all = await this._getAllMeta();
        all[id] = meta;
        await chrome.storage.local.set({ markletMeta: all });
    },

    async _removeMeta(id) {
        const all = await this._getAllMeta();
        delete all[id];
        await chrome.storage.local.set({ markletMeta: all });
    },

    /* ==================================================================
       PUBLIC — Bookmarklet CRUD
       ================================================================== */

    /** Create a brand-new empty bookmarklet and return it. */
    async createBookmarklet(category) {
        const folderId = await this._getCategoryFolderId(category || 'Uncategorized');
        const bk = await chrome.bookmarks.create({
            parentId: folderId,
            title: 'Untitled',
            url: 'javascript:void(0)'
        });
        const now = new Date().toISOString();
        const meta = {
            description: '',
            tags: [],
            favicon: { type: 'emoji', value: '⚡' },
            runCount: 0,
            lastRunAt: null,
            createdAt: now,
            updatedAt: now,
            order: 0
        };
        await this._saveMeta(bk.id, meta);
        return {
            id: bk.id, name: '', code: '', url: bk.url,
            category: category || 'Uncategorized', ...meta
        };
    },

    /** Return every bookmarklet under the Marklet folder. */
    async getBookmarklets() {
        const rootId = await this._ensureRootFolder();
        const tree = await chrome.bookmarks.getSubTree(rootId);
        const allMeta = await this._getAllMeta();
        const list = [];

        const walk = (nodes, category) => {
            for (const n of nodes) {
                if (n.url && n.url.startsWith('javascript:')) {
                    const m = allMeta[n.id] || {};
                    list.push({
                        id: n.id,
                        name: n.title || 'Untitled',
                        url: n.url,
                        code: n.url,
                        category,
                        description: m.description || '',
                        tags: m.tags || [],
                        favicon: m.favicon || { type: 'emoji', value: '⚡' },
                        runCount: m.runCount || 0,
                        lastRunAt: m.lastRunAt || null,
                        createdAt: m.createdAt || null,
                        updatedAt: m.updatedAt || null,
                        order: m.order ?? n.index ?? 0
                    });
                } else if (n.children) {
                    walk(n.children, n.id === rootId ? 'Uncategorized' : (n.title || 'Uncategorized'));
                }
            }
        };

        if (tree[0].children) walk(tree[0].children, 'Uncategorized');
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        return list;
    },

    /** Save (create or update) a bookmarklet.
     *  `bm.code` should be the pretty-printed source — it is smooshed into
     *  a single-line javascript: URL automatically. */
    async saveBookmarklet(bm) {
        const folderId = await this._getCategoryFolderId(bm.category);
        const url = Utils.buildBookmarkUrl(bm.code || '');

        if (bm.id && await this._bookmarkExists(bm.id)) {
            await chrome.bookmarks.update(bm.id, { title: bm.name || 'Untitled', url });
            const [existing] = await chrome.bookmarks.get(bm.id);
            if (existing.parentId !== folderId) {
                await chrome.bookmarks.move(bm.id, { parentId: folderId });
            }
        } else {
            const bk = await chrome.bookmarks.create({
                parentId: folderId,
                title: bm.name || 'Untitled',
                url
            });
            bm.id = bk.id;
        }

        const now = new Date().toISOString();
        await this._saveMeta(bm.id, {
            description: bm.description || '',
            tags: bm.tags || [],
            favicon: bm.favicon || { type: 'emoji', value: '⚡' },
            runCount: bm.runCount || 0,
            lastRunAt: bm.lastRunAt || null,
            createdAt: bm.createdAt || now,
            updatedAt: now,
            order: bm.order ?? 0
        });
        return bm;
    },

    async deleteBookmarklet(id) {
        try { await chrome.bookmarks.remove(id); } catch { /* already gone */ }
        await this._removeMeta(id);
    },

    async incrementRunCount(id) {
        const all = await this._getAllMeta();
        const m = all[id] || {};
        m.runCount = (m.runCount || 0) + 1;
        m.lastRunAt = new Date().toISOString();
        all[id] = m;
        await chrome.storage.local.set({ markletMeta: all });
    },

    /* ==================================================================
       PUBLIC — Categories (sub-folders)
       ================================================================== */

    async getCategories() {
        const rootId = await this._ensureRootFolder();
        const children = await chrome.bookmarks.getChildren(rootId);
        const cats = ['Uncategorized'];
        for (const c of children) { if (!c.url) cats.push(c.title); }
        return cats;
    },

    async addCategory(name) {
        if (!name || name === 'Uncategorized') return;
        const rootId = await this._ensureRootFolder();
        const children = await chrome.bookmarks.getChildren(rootId);
        if (!children.some(c => !c.url && c.title === name)) {
            await chrome.bookmarks.create({ parentId: rootId, title: name });
        }
    },

    async deleteCategory(name) {
        if (!name || name === 'Uncategorized') return;
        const rootId = await this._ensureRootFolder();
        const children = await chrome.bookmarks.getChildren(rootId);
        const folder = children.find(c => !c.url && c.title === name);
        if (folder) {
            const items = await chrome.bookmarks.getChildren(folder.id);
            for (const item of items) {
                await chrome.bookmarks.move(item.id, { parentId: rootId });
            }
            await chrome.bookmarks.remove(folder.id);
        }
    },

    /* ==================================================================
       PUBLIC — Settings
       ================================================================== */

    async getSettings() {
        const r = await chrome.storage.local.get('markletSettings');
        return { ...DEFAULT_SETTINGS, ...(r.markletSettings || {}) };
    },

    async saveSettings(settings) {
        const cur = await this.getSettings();
        await chrome.storage.local.set({ markletSettings: { ...cur, ...settings } });
    },

    /* ==================================================================
       PUBLIC — Reorder / Import / Export
       ================================================================== */

    async reorderBookmarklets(orderedIds) {
        const all = await this._getAllMeta();
        orderedIds.forEach((id, i) => {
            if (!all[id]) all[id] = {};
            all[id].order = i;
        });
        await chrome.storage.local.set({ markletMeta: all });
    },

    async exportData() {
        const bookmarklets = await this.getBookmarklets();
        const categories = await this.getCategories();
        const settings = await this.getSettings();
        return JSON.stringify({ bookmarklets, categories, settings }, null, 2);
    },

    async importData(jsonStr) {
        const data = JSON.parse(jsonStr);
        if (!data.bookmarklets || !Array.isArray(data.bookmarklets)) {
            throw new Error('Invalid import data: missing bookmarklets array');
        }
        for (const cat of (data.categories || [])) {
            if (cat !== 'Uncategorized') await this.addCategory(cat);
        }
        for (const bm of data.bookmarklets) {
            bm.id = null; // force creation of a new Chrome bookmark
            await this.saveBookmarklet(bm);
        }
        return data;
    },

    /* ==================================================================
       MIGRATION — from old chrome.storage.local-only format
       ================================================================== */

    async migrateIfNeeded() {
        const r = await chrome.storage.local.get(['markletData', 'markletMigrated']);
        if (r.markletMigrated || !r.markletData) return;
        const data = r.markletData;
        if (!data.bookmarklets || data.bookmarklets.length === 0) {
            await chrome.storage.local.set({ markletMigrated: true });
            return;
        }
        for (const cat of (data.categories || [])) {
            if (cat !== 'Uncategorized') await this.addCategory(cat);
        }
        for (const bm of data.bookmarklets) {
            await this.saveBookmarklet({
                name: bm.name,
                code: bm.code,
                category: bm.category || 'Uncategorized',
                description: bm.description || '',
                tags: bm.tags || [],
                favicon: bm.favicon,
                runCount: bm.runCount || 0,
                lastRunAt: bm.lastRunAt,
                createdAt: bm.createdAt,
                order: bm.order || 0
            });
        }
        if (data.settings) await this.saveSettings(data.settings);
        await chrome.storage.local.remove('markletData');
        await chrome.storage.local.set({ markletMigrated: true });
    },

    generateId() { return crypto.randomUUID(); }
};
