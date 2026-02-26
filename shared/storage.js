/* Shared storage abstraction for Marklet */

const DEFAULT_DATA = {
    bookmarklets: [],
    categories: ['Uncategorized'],
    settings: {
        theme: 'dark',
        defaultCategory: 'Uncategorized',
        editorFontSize: 14,
        editorTabSize: 2
    }
};

const Storage = {
    async getAll() {
        return new Promise((resolve) => {
            chrome.storage.local.get('markletData', (result) => {
                resolve(result.markletData || structuredClone(DEFAULT_DATA));
            });
        });
    },

    async saveAll(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ markletData: data }, resolve);
        });
    },

    async getBookmarklets() {
        const data = await this.getAll();
        return data.bookmarklets;
    },

    async saveBookmarklet(bookmarklet) {
        const data = await this.getAll();
        const idx = data.bookmarklets.findIndex(b => b.id === bookmarklet.id);
        if (idx >= 0) {
            bookmarklet.updatedAt = new Date().toISOString();
            data.bookmarklets[idx] = bookmarklet;
        } else {
            bookmarklet.createdAt = new Date().toISOString();
            bookmarklet.updatedAt = bookmarklet.createdAt;
            bookmarklet.runCount = 0;
            bookmarklet.order = data.bookmarklets.length;
            data.bookmarklets.push(bookmarklet);
        }
        if (bookmarklet.category && !data.categories.includes(bookmarklet.category)) {
            data.categories.push(bookmarklet.category);
        }
        await this.saveAll(data);
        return bookmarklet;
    },

    async deleteBookmarklet(id) {
        const data = await this.getAll();
        data.bookmarklets = data.bookmarklets.filter(b => b.id !== id);
        await this.saveAll(data);
    },

    async incrementRunCount(id) {
        const data = await this.getAll();
        const bm = data.bookmarklets.find(b => b.id === id);
        if (bm) {
            bm.runCount = (bm.runCount || 0) + 1;
            bm.lastRunAt = new Date().toISOString();
            await this.saveAll(data);
        }
    },

    async getCategories() {
        const data = await this.getAll();
        return data.categories;
    },

    async addCategory(name) {
        const data = await this.getAll();
        if (!data.categories.includes(name)) {
            data.categories.push(name);
            await this.saveAll(data);
        }
    },

    async deleteCategory(name) {
        const data = await this.getAll();
        data.categories = data.categories.filter(c => c !== name);
        data.bookmarklets.forEach(b => {
            if (b.category === name) b.category = 'Uncategorized';
        });
        await this.saveAll(data);
    },

    async getSettings() {
        const data = await this.getAll();
        return data.settings;
    },

    async saveSettings(settings) {
        const data = await this.getAll();
        data.settings = { ...data.settings, ...settings };
        await this.saveAll(data);
    },

    async exportData() {
        const data = await this.getAll();
        return JSON.stringify(data, null, 2);
    },

    async importData(jsonStr) {
        const data = JSON.parse(jsonStr);
        if (!data.bookmarklets || !Array.isArray(data.bookmarklets)) {
            throw new Error('Invalid import data: missing bookmarklets array');
        }
        if (!data.categories) data.categories = ['Uncategorized'];
        if (!data.settings) data.settings = DEFAULT_DATA.settings;
        await this.saveAll(data);
        return data;
    },

    async reorderBookmarklets(orderedIds) {
        const data = await this.getAll();
        orderedIds.forEach((id, index) => {
            const bm = data.bookmarklets.find(b => b.id === id);
            if (bm) bm.order = index;
        });
        data.bookmarklets.sort((a, b) => a.order - b.order);
        await this.saveAll(data);
    },

    generateId() {
        return crypto.randomUUID();
    }
};
