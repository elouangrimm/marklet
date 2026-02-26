/* JavaScript syntax highlighter for the Marklet code editor */

const Highlighter = {
    KEYWORDS: new Set([
        'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
        'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
        'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
        'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
        'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
        'protected', 'public', 'static', 'yield', 'async', 'await', 'of', 'from'
    ]),

    BUILTINS: new Set([
        'console', 'window', 'document', 'navigator', 'location', 'history',
        'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number',
        'Boolean', 'RegExp', 'Map', 'Set', 'Promise', 'Symbol', 'Error',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'null',
        'NaN', 'Infinity', 'true', 'false', 'alert', 'prompt', 'confirm',
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'fetch', 'Request', 'Response', 'URL', 'URLSearchParams',
        'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
        'querySelector', 'querySelectorAll', 'getElementById', 'createElement'
    ]),

    escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    highlight(code) {
        const tokens = this.tokenize(code);
        return tokens.map(t => {
            const escaped = this.escapeHtml(t.value);
            if (t.type === 'plain') return escaped;
            return `<span class="hl-${t.type}">${escaped}</span>`;
        }).join('');
    },

    tokenize(code) {
        const tokens = [];
        let i = 0;
        const len = code.length;

        while (i < len) {
            const ch = code[i];

            if (ch === '/' && code[i + 1] === '/') {
                let end = code.indexOf('\n', i);
                if (end === -1) end = len;
                tokens.push({ type: 'comment', value: code.slice(i, end) });
                i = end;
                continue;
            }

            if (ch === '/' && code[i + 1] === '*') {
                let end = code.indexOf('*/', i + 2);
                if (end === -1) end = len - 2;
                tokens.push({ type: 'comment', value: code.slice(i, end + 2) });
                i = end + 2;
                continue;
            }

            if (ch === '"' || ch === "'" || ch === '`') {
                let j = i + 1;
                while (j < len) {
                    if (code[j] === '\\') { j += 2; continue; }
                    if (code[j] === ch) { j++; break; }
                    j++;
                }
                tokens.push({ type: 'string', value: code.slice(i, j) });
                i = j;
                continue;
            }

            if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < len && /[0-9]/.test(code[i + 1]))) {
                let j = i;
                if (ch === '0' && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
                    j += 2;
                    while (j < len && /[0-9a-fA-F]/.test(code[j])) j++;
                } else {
                    while (j < len && /[0-9.]/.test(code[j])) j++;
                    if (j < len && (code[j] === 'e' || code[j] === 'E')) {
                        j++;
                        if (j < len && (code[j] === '+' || code[j] === '-')) j++;
                        while (j < len && /[0-9]/.test(code[j])) j++;
                    }
                }
                tokens.push({ type: 'number', value: code.slice(i, j) });
                i = j;
                continue;
            }

            if (/[a-zA-Z_$]/.test(ch)) {
                let j = i;
                while (j < len && /[a-zA-Z0-9_$]/.test(code[j])) j++;
                const word = code.slice(i, j);
                if (this.KEYWORDS.has(word)) {
                    tokens.push({ type: 'keyword', value: word });
                } else if (this.BUILTINS.has(word)) {
                    tokens.push({ type: 'builtin', value: word });
                } else if (j < len && code[j] === '(') {
                    tokens.push({ type: 'function', value: word });
                } else {
                    tokens.push({ type: 'plain', value: word });
                }
                i = j;
                continue;
            }

            if (/[+\-*/%=<>!&|^~?:]/.test(ch)) {
                let j = i;
                while (j < len && /[+\-*/%=<>!&|^~?:]/.test(code[j])) j++;
                tokens.push({ type: 'operator', value: code.slice(i, j) });
                i = j;
                continue;
            }

            if (/[(){}[\],;.]/.test(ch)) {
                tokens.push({ type: 'punctuation', value: ch });
                i++;
                continue;
            }

            tokens.push({ type: 'plain', value: ch });
            i++;
        }

        return tokens;
    }
};
