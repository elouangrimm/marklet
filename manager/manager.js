/* Marklet Manager Logic */

document.addEventListener('DOMContentLoaded', () => {
    /* ---- Element references ---- */
    const sidebarNav = document.getElementById('sidebarNav');
    const sidebarSearch = document.getElementById('sidebarSearch');
    const newBookmarkletBtn = document.getElementById('newBookmarklet');
    const emptyNewBtn = document.getElementById('emptyNewBtn');
    const emptyState = document.getElementById('emptyState');
    const editorPanel = document.getElementById('editorPanel');
    const importBtn = document.getElementById('importBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importFile = document.getElementById('importFile');

    /* Editor fields */
    const bmName = document.getElementById('bmName');
    const bmCategory = document.getElementById('bmCategory');
    const bmTags = document.getElementById('bmTags');
    const bmDescription = document.getElementById('bmDescription');
    const codeInput = document.getElementById('codeInput');
    const highlightCode = document.getElementById('highlightCode');
    const lineNumbers = document.getElementById('lineNumbers');
    const faviconPreview = document.getElementById('faviconPreview');
    const faviconPicker = document.getElementById('faviconPicker');
    const editorLayers = document.querySelector('.editor-layers');

    /* Buttons */
    const saveBtn = document.getElementById('saveBtn');
    const runBtn = document.getElementById('runBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const copyUrlBtn = document.getElementById('copyUrlBtn');
    const formatBtn = document.getElementById('formatBtn');
    const minifyBtn = document.getElementById('minifyBtn');
    const wrapIIFEBtn = document.getElementById('wrapIIFEBtn');
    const addCategoryBtn = document.getElementById('addCategoryBtn');

    /* Status */
    const statusMsg = document.getElementById('statusMsg');
    const charCount = document.getElementById('charCount');
    const runCountLabel = document.getElementById('runCountLabel');

    /* Modals */
    const faviconModal = document.getElementById('faviconModal');
    const deleteModal = document.getElementById('deleteModal');
    const categoryModal = document.getElementById('categoryModal');
    const deleteTargetName = document.getElementById('deleteTargetName');

    /* ---- State ---- */
    let allBookmarklets = [];
    let categories = [];
    let currentId = null;
    let currentFavicon = null;

    /* ---- Emoji data ---- */
    const EMOJI_LIST = [
        '⚡', '🔖', '📝', '🚀', '🔧', '🔨', '🛠️', '⚙️',
        '📊', '📈', '📋', '🗂️', '📁', '📂', '🗃️', '💾',
        '🔍', '🔎', '🌐', '🌍', '🔗', '📌', '📎', '🏷️',
        '✅', '❌', '⭐', '💡', '🎯', '🏆', '🎨', '🖌️',
        '💻', '🖥️', '📱', '⌨️', '🖱️', '💬', '💭', '📢',
        '🔔', '🔕', '📣', '📯', '🕐', '⏱️', '⏰', '📅',
        '🔒', '🔓', '🔑', '🛡️', '🐛', '🐞', '🧪', '🔬',
        '📦', '🎁', '🧩', '🎲', '🎮', '🕹️', '📸', '🎵',
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
        '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪',
        '🅰️', '🅱️', '🆎', '🆑', '🔤', '🔠', '🔡', '🔢',
        '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣',
    ];

    /* ================================================================
       INITIALIZATION
       ================================================================ */

    async function init() {
        await loadData();
        renderSidebar();
        populateCategories();
        setupCodeEditor();
        setupEventListeners();
        showEmptyOrEditor();

        /* Keyboard shortcuts */
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (currentId !== null) save();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                createNew();
            }
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
    }

    async function loadData() {
        const data = await Storage.getAll();
        allBookmarklets = data.bookmarklets || [];
        categories = data.categories || ['Uncategorized'];
        allBookmarklets.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    function showEmptyOrEditor() {
        if (allBookmarklets.length === 0 && !currentId) {
            emptyState.classList.remove('hidden');
            editorPanel.classList.add('hidden');
        } else if (currentId) {
            emptyState.classList.add('hidden');
            editorPanel.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            editorPanel.classList.add('hidden');
        }
    }

    /* ================================================================
       SIDEBAR
       ================================================================ */

    function renderSidebar(filterQuery) {
        const query = (filterQuery || '').toLowerCase().trim();
        let filtered = allBookmarklets;
        if (query) {
            filtered = allBookmarklets.filter(bm =>
                bm.name.toLowerCase().includes(query) ||
                (bm.description && bm.description.toLowerCase().includes(query)) ||
                (bm.tags && bm.tags.some(t => t.toLowerCase().includes(query)))
            );
        }

        const grouped = {};
        for (const cat of categories) {
            grouped[cat] = [];
        }
        for (const bm of filtered) {
            const cat = bm.category || 'Uncategorized';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(bm);
        }

        let html = '';
        for (const [cat, items] of Object.entries(grouped)) {
            if (items.length === 0 && query) continue;
            const isDefault = cat === 'Uncategorized';
            const deleteBtn = isDefault ? '' :
                `<button class="sidebar-delete-cat" data-cat="${Utils.escapeHtml(cat)}" title="Delete category">×</button>`;

            html += `
                <div class="sidebar-category" data-category="${Utils.escapeHtml(cat)}">
                    <div class="sidebar-category-header">
                        <span class="sidebar-category-name">${Utils.escapeHtml(cat)}</span>
                        <div style="display:flex;align-items:center;gap:4px">
                            ${deleteBtn}
                            <span class="sidebar-category-toggle">▼</span>
                        </div>
                    </div>
                    <div class="sidebar-category-items">
                        ${items.map(bm => `
                            <div class="sidebar-item ${bm.id === currentId ? 'active' : ''}" data-id="${bm.id}">
                                <span class="sidebar-item-favicon">${renderFaviconHtml(bm.favicon)}</span>
                                <span class="sidebar-item-name">${Utils.escapeHtml(bm.name || 'Untitled')}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        sidebarNav.innerHTML = html;

        /* Sidebar click handlers */
        sidebarNav.querySelectorAll('.sidebar-item').forEach(el => {
            el.addEventListener('click', () => selectBookmarklet(el.dataset.id));
        });

        sidebarNav.querySelectorAll('.sidebar-category-header').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('sidebar-delete-cat')) return;
                el.parentElement.classList.toggle('collapsed');
            });
        });

        sidebarNav.querySelectorAll('.sidebar-delete-cat').forEach(el => {
            el.addEventListener('click', async (e) => {
                e.stopPropagation();
                await Storage.deleteCategory(el.dataset.cat);
                await loadData();
                renderSidebar();
                populateCategories();
            });
        });

        /* Drag and drop reordering */
        setupDragAndDrop();
    }

    function renderFaviconHtml(favicon) {
        if (!favicon) return '⚡';
        if (favicon.type === 'emoji') return favicon.value || '⚡';
        if (favicon.type === 'url' || favicon.type === 'data') {
            return `<img src="${Utils.escapeHtml(favicon.value)}" alt="">`;
        }
        return '⚡';
    }

    /* ================================================================
       DRAG AND DROP
       ================================================================ */

    function setupDragAndDrop() {
        let dragItem = null;
        let dragPlaceholder = null;

        sidebarNav.querySelectorAll('.sidebar-item').forEach(el => {
            el.setAttribute('draggable', 'true');

            el.addEventListener('dragstart', (e) => {
                dragItem = el;
                el.style.opacity = '0.4';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', el.dataset.id);
            });

            el.addEventListener('dragend', () => {
                el.style.opacity = '';
                if (dragPlaceholder && dragPlaceholder.parentNode) {
                    dragPlaceholder.parentNode.removeChild(dragPlaceholder);
                }
                dragPlaceholder = null;
                dragItem = null;
                saveOrder();
            });

            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = el.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    el.parentNode.insertBefore(getDragPlaceholder(), el);
                } else {
                    el.parentNode.insertBefore(getDragPlaceholder(), el.nextSibling);
                }
            });

            el.addEventListener('drop', (e) => {
                e.preventDefault();
                if (dragItem && dragPlaceholder && dragPlaceholder.parentNode) {
                    dragPlaceholder.parentNode.insertBefore(dragItem, dragPlaceholder);
                    dragPlaceholder.parentNode.removeChild(dragPlaceholder);
                }
            });
        });

        function getDragPlaceholder() {
            if (!dragPlaceholder) {
                dragPlaceholder = document.createElement('div');
                dragPlaceholder.style.height = '2px';
                dragPlaceholder.style.backgroundColor = 'var(--accent)';
                dragPlaceholder.style.margin = '2px 16px';
            }
            return dragPlaceholder;
        }

        async function saveOrder() {
            const items = sidebarNav.querySelectorAll('.sidebar-item');
            const ids = Array.from(items).map(el => el.dataset.id);
            await Storage.reorderBookmarklets(ids);
            await loadData();
        }
    }

    /* ================================================================
       BOOKMARKLET CRUD
       ================================================================ */

    function createNew() {
        const id = Storage.generateId();
        const bm = {
            id,
            name: '',
            description: '',
            code: '',
            favicon: { type: 'emoji', value: '⚡' },
            category: 'Uncategorized',
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            runCount: 0,
            order: allBookmarklets.length
        };
        allBookmarklets.push(bm);
        currentId = id;
        loadEditor(bm);
        renderSidebar();
        showEmptyOrEditor();
        bmName.focus();
    }

    function selectBookmarklet(id) {
        currentId = id;
        const bm = allBookmarklets.find(b => b.id === id);
        if (bm) {
            loadEditor(bm);
            renderSidebar();
            showEmptyOrEditor();
        }
    }

    function loadEditor(bm) {
        bmName.value = bm.name || '';
        bmDescription.value = bm.description || '';
        bmTags.value = (bm.tags || []).join(', ');
        codeInput.value = bm.code || '';
        currentFavicon = bm.favicon || { type: 'emoji', value: '⚡' };
        updateFaviconPreview();
        populateCategories();
        bmCategory.value = bm.category || 'Uncategorized';
        updateHighlight();
        updateLineNumbers();
        updateCharCount();
        updateRunCount(bm);
    }

    async function save() {
        if (!currentId) return;

        const bm = allBookmarklets.find(b => b.id === currentId);
        if (!bm) return;

        bm.name = bmName.value.trim() || 'Untitled';
        bm.description = bmDescription.value.trim();
        bm.code = codeInput.value;
        bm.category = bmCategory.value;
        bm.tags = bmTags.value.split(',').map(t => t.trim()).filter(Boolean);
        bm.favicon = currentFavicon;

        await Storage.saveBookmarklet(bm);
        await loadData();
        renderSidebar();
        showStatus('Saved!', 'success');
    }

    async function deleteCurrent() {
        if (!currentId) return;
        await Storage.deleteBookmarklet(currentId);
        currentId = null;
        await loadData();
        renderSidebar();
        editorPanel.classList.add('hidden');
        showEmptyOrEditor();
        closeAllModals();
        showStatus('Deleted', 'danger');
    }

    function runCurrent() {
        if (!currentId) return;
        const bm = allBookmarklets.find(b => b.id === currentId);
        if (!bm) return;

        const code = codeInput.value || bm.code;
        chrome.runtime.sendMessage({
            action: 'runBookmarklet',
            code: code,
            id: bm.id
        });
        showStatus('Running...', 'success');
        bm.runCount = (bm.runCount || 0) + 1;
        updateRunCount(bm);
    }

    function copyUrl() {
        const code = codeInput.value;
        if (!code.trim()) { showStatus('No code to copy', 'warning'); return; }
        const url = Utils.toBookmarkletUrl(code);
        navigator.clipboard.writeText(url).then(() => {
            showStatus('Copied bookmarklet URL!', 'success');
        });
    }

    /* ================================================================
       CODE EDITOR
       ================================================================ */

    function setupCodeEditor() {
        codeInput.addEventListener('input', () => {
            updateHighlight();
            updateLineNumbers();
            updateCharCount();
        });

        codeInput.addEventListener('scroll', () => {
            syncScroll();
        });

        codeInput.addEventListener('keydown', (e) => {
            /* Tab support */
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = codeInput.selectionStart;
                const end = codeInput.selectionEnd;
                const val = codeInput.value;

                if (e.shiftKey) {
                    /* Outdent */
                    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
                    const lineText = val.slice(lineStart, start);
                    const spaces = lineText.match(/^ {1,2}/);
                    if (spaces) {
                        codeInput.value = val.slice(0, lineStart) + val.slice(lineStart + spaces[0].length);
                        codeInput.selectionStart = codeInput.selectionEnd = start - spaces[0].length;
                    }
                } else {
                    codeInput.value = val.slice(0, start) + '  ' + val.slice(end);
                    codeInput.selectionStart = codeInput.selectionEnd = start + 2;
                }
                codeInput.dispatchEvent(new Event('input'));
            }

            /* Auto-close brackets */
            const pairs = { '(': ')', '[': ']', '{': '}', "'": "'", '"': '"', '`': '`' };
            if (pairs[e.key]) {
                const start = codeInput.selectionStart;
                const end = codeInput.selectionEnd;
                if (start !== end) {
                    e.preventDefault();
                    const val = codeInput.value;
                    const selected = val.slice(start, end);
                    codeInput.value = val.slice(0, start) + e.key + selected + pairs[e.key] + val.slice(end);
                    codeInput.selectionStart = start + 1;
                    codeInput.selectionEnd = end + 1;
                    codeInput.dispatchEvent(new Event('input'));
                }
            }

            /* Enter auto-indent */
            if (e.key === 'Enter') {
                const start = codeInput.selectionStart;
                const val = codeInput.value;
                const lineStart = val.lastIndexOf('\n', start - 1) + 1;
                const currentLine = val.slice(lineStart, start);
                const indent = currentLine.match(/^\s*/)[0];
                const lastChar = val[start - 1];

                let extra = '';
                if (lastChar === '{' || lastChar === '(' || lastChar === '[') {
                    extra = '  ';
                }

                e.preventDefault();
                codeInput.value = val.slice(0, start) + '\n' + indent + extra + val.slice(start);
                codeInput.selectionStart = codeInput.selectionEnd = start + 1 + indent.length + extra.length;
                codeInput.dispatchEvent(new Event('input'));
            }
        });
    }

    function updateHighlight() {
        const code = codeInput.value;
        highlightCode.innerHTML = Highlighter.highlight(code) + '\n';
    }

    function updateLineNumbers() {
        const lines = codeInput.value.split('\n').length;
        let html = '';
        for (let i = 1; i <= lines; i++) {
            html += `<span class="line-num">${i}</span>`;
        }
        lineNumbers.innerHTML = html;
    }

    function syncScroll() {
        const pre = document.getElementById('highlightLayer');
        pre.scrollTop = codeInput.scrollTop;
        pre.scrollLeft = codeInput.scrollLeft;
        lineNumbers.scrollTop = codeInput.scrollTop;
    }

    function updateCharCount() {
        const code = codeInput.value;
        const chars = code.length;
        const lines = code.split('\n').length;
        const urlLen = Utils.toBookmarkletUrl(code).length;
        charCount.textContent = `${lines} lines · ${chars} chars · URL: ${urlLen} chars`;
    }

    function updateRunCount(bm) {
        if (bm.runCount > 0) {
            runCountLabel.textContent = `Ran ${bm.runCount} time${bm.runCount !== 1 ? 's' : ''}`;
            if (bm.lastRunAt) {
                runCountLabel.textContent += ` · Last: ${Utils.timeAgo(bm.lastRunAt)}`;
            }
        } else {
            runCountLabel.textContent = 'Never run';
        }
    }

    /* ================================================================
       CATEGORIES
       ================================================================ */

    function populateCategories() {
        bmCategory.innerHTML = categories.map(c =>
            `<option value="${Utils.escapeHtml(c)}">${Utils.escapeHtml(c)}</option>`
        ).join('');
    }

    /* ================================================================
       FAVICON PICKER
       ================================================================ */

    function updateFaviconPreview() {
        if (!currentFavicon || currentFavicon.type === 'emoji') {
            faviconPreview.textContent = (currentFavicon && currentFavicon.value) || '⚡';
            const img = faviconPicker.querySelector('img');
            if (img) img.remove();
        } else {
            faviconPreview.textContent = '';
            let img = faviconPicker.querySelector('img');
            if (!img) {
                img = document.createElement('img');
                faviconPicker.appendChild(img);
            }
            img.src = currentFavicon.value;
        }
    }

    function openFaviconModal() {
        faviconModal.classList.add('active');
        setupEmojiGrid();
    }

    function setupEmojiGrid() {
        const grid = document.getElementById('emojiGrid');
        const searchInput = document.getElementById('emojiSearch');

        function renderEmojis(filter) {
            const query = (filter || '').toLowerCase().trim();
            const emojis = query
                ? EMOJI_LIST.filter(e => e.includes(query))
                : EMOJI_LIST;

            grid.innerHTML = emojis.map(e =>
                `<button class="emoji-btn" data-emoji="${e}">${e}</button>`
            ).join('');

            grid.querySelectorAll('.emoji-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentFavicon = { type: 'emoji', value: btn.dataset.emoji };
                    updateFaviconPreview();
                    faviconModal.classList.remove('active');
                });
            });
        }

        renderEmojis();

        searchInput.value = '';
        searchInput.addEventListener('input', Utils.debounce(() => {
            renderEmojis(searchInput.value);
        }, 150));
    }

    /* ================================================================
       IMPORT / EXPORT
       ================================================================ */

    async function exportData() {
        const json = await Storage.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `marklet-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showStatus('Exported!', 'success');
    }

    async function importData(file) {
        try {
            const text = await file.text();
            await Storage.importData(text);
            await loadData();
            currentId = null;
            renderSidebar();
            populateCategories();
            showEmptyOrEditor();
            showStatus('Imported successfully!', 'success');
        } catch (err) {
            showStatus('Import failed: ' + err.message, 'danger');
        }
    }

    /* ================================================================
       MODALS
       ================================================================ */

    function closeAllModals() {
        faviconModal.classList.remove('active');
        deleteModal.classList.remove('active');
        categoryModal.classList.remove('active');
    }

    function showDeleteConfirm() {
        const bm = allBookmarklets.find(b => b.id === currentId);
        if (!bm) return;
        deleteTargetName.textContent = bm.name || 'Untitled';
        deleteModal.classList.add('active');
    }

    function showCategoryModal() {
        categoryModal.classList.add('active');
        document.getElementById('newCategoryInput').value = '';
        document.getElementById('newCategoryInput').focus();
    }

    /* ================================================================
       STATUS
       ================================================================ */

    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.style.color = type === 'success' ? 'var(--success)' :
            type === 'danger' ? 'var(--danger)' :
            type === 'warning' ? 'var(--warning)' : 'var(--text-faint)';
        setTimeout(() => { statusMsg.textContent = ''; }, 3000);
    }

    /* ================================================================
       EVENT LISTENERS
       ================================================================ */

    function setupEventListeners() {
        newBookmarkletBtn.addEventListener('click', createNew);
        emptyNewBtn.addEventListener('click', createNew);

        saveBtn.addEventListener('click', save);
        runBtn.addEventListener('click', runCurrent);
        deleteBtn.addEventListener('click', showDeleteConfirm);
        copyUrlBtn.addEventListener('click', copyUrl);

        formatBtn.addEventListener('click', () => {
            codeInput.value = Utils.formatCode(codeInput.value);
            codeInput.dispatchEvent(new Event('input'));
            showStatus('Formatted', 'success');
        });

        minifyBtn.addEventListener('click', () => {
            codeInput.value = Utils.minifyCode(codeInput.value);
            codeInput.dispatchEvent(new Event('input'));
            showStatus('Minified', 'success');
        });

        wrapIIFEBtn.addEventListener('click', () => {
            const code = codeInput.value.trim();
            if (!code.startsWith('(function')) {
                codeInput.value = '(function () {\n  ' +
                    code.split('\n').join('\n  ') +
                    '\n})();';
                codeInput.dispatchEvent(new Event('input'));
                showStatus('Wrapped in IIFE', 'success');
            } else {
                showStatus('Already wrapped', 'warning');
            }
        });

        faviconPicker.addEventListener('click', openFaviconModal);

        /* Auto-save on field changes */
        const autoSave = Utils.debounce(() => { if (currentId) save(); }, 1500);
        bmName.addEventListener('input', () => {
            autoSave();
            renderSidebar();
        });
        bmDescription.addEventListener('input', autoSave);
        bmTags.addEventListener('input', autoSave);
        bmCategory.addEventListener('change', autoSave);
        codeInput.addEventListener('input', autoSave);

        /* Search */
        sidebarSearch.addEventListener('input', Utils.debounce(() => {
            renderSidebar(sidebarSearch.value);
        }, 200));

        /* Import / Export */
        exportBtn.addEventListener('click', exportData);
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                importData(e.target.files[0]);
                e.target.value = '';
            }
        });

        /* Delete modal */
        document.getElementById('deleteCancel').addEventListener('click', closeAllModals);
        document.getElementById('deleteConfirm').addEventListener('click', deleteCurrent);

        /* Category modal */
        addCategoryBtn.addEventListener('click', showCategoryModal);
        document.getElementById('categoryCancel').addEventListener('click', closeAllModals);
        document.getElementById('categorySave').addEventListener('click', async () => {
            const name = document.getElementById('newCategoryInput').value.trim();
            if (name) {
                await Storage.addCategory(name);
                await loadData();
                populateCategories();
                bmCategory.value = name;
                renderSidebar();
                closeAllModals();
                showStatus('Category added', 'success');
            }
        });

        /* Favicon modal */
        document.getElementById('faviconModalClose').addEventListener('click', closeAllModals);

        /* Favicon tabs */
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.favicon-tab').forEach(t => t.classList.add('hidden'));
                document.getElementById(btn.dataset.tab + 'Tab').classList.remove('hidden');
            });
        });

        /* Favicon URL */
        document.getElementById('faviconUrlSave').addEventListener('click', () => {
            const url = document.getElementById('faviconUrlInput').value.trim();
            if (url) {
                currentFavicon = { type: 'url', value: url };
                updateFaviconPreview();
                faviconModal.classList.remove('active');
            }
        });

        document.getElementById('faviconUrlInput').addEventListener('input', Utils.debounce(() => {
            const url = document.getElementById('faviconUrlInput').value.trim();
            const preview = document.getElementById('faviconUrlPreview');
            if (url) {
                preview.innerHTML = `<img src="${Utils.escapeHtml(url)}" alt="Preview">`;
            } else {
                preview.innerHTML = '';
            }
        }, 300));

        /* Favicon upload */
        document.getElementById('faviconFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                currentFavicon = { type: 'data', value: reader.result };
                updateFaviconPreview();
                document.getElementById('faviconUploadPreview').innerHTML =
                    `<img src="${reader.result}" alt="Preview">`;
                faviconModal.classList.remove('active');
            };
            reader.readAsDataURL(file);
        });

        /* Close modals on overlay click */
        [faviconModal, deleteModal, categoryModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAllModals();
            });
        });
    }

    /* ---- Boot ---- */
    init();
});
