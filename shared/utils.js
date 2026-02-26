/* Utility functions for Marklet */

const Utils = {

    /* ================================================================
       CODE FORMATTING — uses js_beautify (loaded via shared/beautify.js)
       ================================================================ */

    /** Prettify code for the editor using js-beautify. */
    formatCode(code) {
        let clean = code.trim();
        if (clean.startsWith('javascript:')) clean = clean.slice(11);
        try {
            clean = decodeURIComponent(clean);
        } catch { /* not encoded, that's fine */ }

        if (typeof js_beautify === 'function') {
            return js_beautify(clean, {
                indent_size: 2,
                indent_char: ' ',
                max_preserve_newlines: 2,
                preserve_newlines: true,
                keep_array_indentation: false,
                break_chained_methods: false,
                space_before_conditional: true,
                unescape_strings: false,
                jslint_happy: false,
                end_with_newline: false,
                wrap_line_length: 0,
                e4x: false,
                comma_first: false,
                operator_position: 'before-newline'
            });
        }
        // Fallback if js_beautify is not loaded (e.g. in popup or background)
        return clean;
    },

    /* ================================================================
       SMOOSH — join code into a single line for bookmark URL
       String-aware tokenizer to avoid breaking strings or regexes.
       Comments are stripped (// would break a single-line bookmark).
       This is NOT minification — spacing around operators is preserved.
       ================================================================ */

    /** Collapse pretty-printed code into a single safe line. */
    smooshCode(code) {
        let src = code.trim();
        if (src.startsWith('javascript:')) src = src.slice(11);

        let result = '';
        let i = 0;
        const len = src.length;

        while (i < len) {
            const ch = src[i];

            // String literal — pass through unchanged
            if (ch === '"' || ch === "'" || ch === '`') {
                let j = i + 1;
                while (j < len) {
                    if (src[j] === '\\') { j += 2; continue; }
                    if (src[j] === ch) { j++; break; }
                    j++;
                }
                result += src.slice(i, j);
                i = j;
                continue;
            }

            // Block comment — skip entirely
            if (ch === '/' && src[i + 1] === '*') {
                let end = src.indexOf('*/', i + 2);
                i = end === -1 ? len : end + 2;
                result += ' ';
                continue;
            }

            // Line comment — skip to end of line
            if (ch === '/' && src[i + 1] === '/') {
                let end = src.indexOf('\n', i);
                i = end === -1 ? len : end;
                continue;
            }

            // Newline → space
            if (ch === '\n' || ch === '\r') {
                result += ' ';
                i++;
                continue;
            }

            result += ch;
            i++;
        }

        // Collapse multiple spaces to one
        return result.replace(/  +/g, ' ').trim();
    },

    /** Build a full javascript: bookmark URL from pretty-printed source. */
    buildBookmarkUrl(code) {
        let clean = code.trim();
        if (clean.startsWith('javascript:')) return clean; // already a URL
        const smooshed = this.smooshCode(clean);
        return smooshed ? 'javascript:' + smooshed : 'javascript:void(0)';
    },

    /** Extract readable code from a javascript: URL. */
    fromBookmarkletUrl(url) {
        let code = url.trim();
        if (code.startsWith('javascript:')) code = code.slice(11);
        return code;
    },

    /* ================================================================
       GENERAL HELPERS
       ================================================================ */

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
