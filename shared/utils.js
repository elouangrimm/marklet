/* Utility functions for Marklet */

const Utils = {
    formatCode(code) {
        let clean = code.trim();
        if (clean.startsWith('javascript:')) {
            clean = clean.slice(11);
        }
        if (clean.startsWith('(function(){') || clean.startsWith('(function() {')) {
            clean = clean.replace(/^\(function\(\)\s*\{/, '(function () {\n');
        }
        try {
            let indent = 0;
            const lines = clean.split('\n');
            const formatted = [];
            for (const line of lines) {
                let trimmed = line.trim();
                if (!trimmed) { formatted.push(''); continue; }

                const closers = (trimmed.match(/^[}\])]/) || []).length;
                if (closers > 0) indent = Math.max(0, indent - 1);

                formatted.push('  '.repeat(indent) + trimmed);

                const openers = (trimmed.match(/[{[(](?=[^}\])]*$)/g) || []).length;
                const closersInLine = (trimmed.match(/[}\])]/g) || []).length;
                indent += openers - closersInLine + closers;
                if (indent < 0) indent = 0;
            }
            return formatted.join('\n');
        } catch {
            return clean;
        }
    },

    minifyCode(code) {
        let clean = code.trim();
        if (clean.startsWith('javascript:')) {
            clean = clean.slice(11);
        }
        clean = clean
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');

        clean = clean
            .replace(/\s*\n\s*/g, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/\s*([{}()[\];,=+\-*/<>!&|?:])\s*/g, '$1');

        return clean;
    },

    toBookmarkletUrl(code) {
        let clean = code.trim();
        if (clean.startsWith('javascript:')) return clean;
        return 'javascript:' + this.minifyCode(clean);
    },

    fromBookmarkletUrl(url) {
        let code = url.trim();
        if (code.startsWith('javascript:')) {
            code = code.slice(11);
        }
        return code;
    },

    debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    timeAgo(dateStr) {
        if (!dateStr) return 'never';
        const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        return new Date(dateStr).toLocaleDateString();
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
