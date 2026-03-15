/**
 * Nuilith IDE - Main UI Controller
 */

let pythonWorker = null;
globalThis.term = null;
globalThis.myCodeMirror = null;
globalThis.autosaveTime = Math.floor(Date.now() / 1000);
globalThis.nuilithPrompt = '[[b;green;]>>> ]';
let pendingLintCallback = null;
let lintRequestId = 0;

function initWorker() {
    if (pythonWorker) pythonWorker.terminate();
    pythonWorker = new Worker('worker.js');
    pythonWorker.onmessage = (event) => {
        const { type, text, annotations } = event.data;
        if (type === "LINT_RESULT" && pendingLintCallback) {
            pendingLintCallback(event.data.id ?? 0, annotations);
            pendingLintCallback = null;
        }
        if (type === "PRINT") term.echo(text, { newline: false });
        if (type === "ERROR") {
            term.error(text, { newline: false });
            term.set_prompt(globalThis.nuilithPrompt);
            if (window.ideStateData) window.ideStateData.running = false;
        }
        if (type === "FINISHED") {
            term.set_prompt(globalThis.nuilithPrompt);
            if (window.ideStateData) window.ideStateData.running = false;
        }
    };
}

// Python lint: pyflakes via worker (async)
const pythonLint = function(text, callback) {
    if (!pythonWorker) return;
    const id = ++lintRequestId;
    pendingLintCallback = (resultId, annotations) => {
        if (id === resultId) callback(annotations);
    };
    pythonWorker.postMessage({ type: "LINT", code: text, id });
};
pythonLint.async = true;
CodeMirror.registerHelper("lint", "python", pythonLint);

// Alpine.js State
document.addEventListener('alpine:init', () => {
    Alpine.data('ideState', () => ({
        settingsOpen: false,
        running: false,
        theme: localStorage.getItem('theme') || 'dark',
        fontSize: parseInt(localStorage.getItem('fontSize')) || 16,
        lineNumbers: localStorage.getItem('lineNumbers') !== 'false',
        themes: [
            { id: 'dark', name: 'Dark (Default)', preview: '#1c2130' },
            { id: 'light', name: 'Light', preview: '#f8fafc' },
            { id: 'nord-dark', name: 'Nord Dark', preview: '#2e3440' },
            { id: 'nord-light', name: 'Nord Light', preview: '#e5e9f0' },
            { id: 'dark-red', name: 'Dark Red', preview: '#2d1a1a' },
            { id: 'light-red', name: 'Light Red', preview: '#fff5f5' },
            { id: 'amoled', name: 'AMOLED', preview: '#000000' }
        ],
        init() {
            window.ideStateData = this;
            this.applyTheme();
            this.updateFontSize();
            this.updateLineNumbers();
        },
        setTheme(id) {
            this.theme = id;
            localStorage.setItem('theme', id);
            this.applyTheme();
        },
        applyTheme() {
            const themes = {
                'dark': { bg: '#1c2130', fg: '#ffffff', menu: '#2d3343', accent: '#3b82f6', cm: 'programiz' },
                'light': { bg: '#f8fafc', fg: '#1e293b', menu: '#e2e8f0', accent: '#3b82f6', cm: 'default' },
                'nord-dark': { bg: '#2e3440', fg: '#eceff4', menu: '#3b4252', accent: '#88c0d0', cm: 'nord' },
                'nord-light': { bg: '#e5e9f0', fg: '#2e3440', menu: '#d8dee9', accent: '#81a1c1', cm: 'default' },
                'dark-red': { bg: '#1a0f0f', fg: '#ff9999', menu: '#2d1a1a', accent: '#ef4444', cm: 'rubyblue' },
                'light-red': { bg: '#fff5f5', fg: '#991b1b', menu: '#fee2e2', accent: '#ef4444', cm: 'default' },
                'amoled': { bg: '#000000', fg: '#ffffff', menu: '#111111', accent: '#3b82f6', cm: 'vibrant-ink' }
            };
            const t = themes[this.theme] || themes.dark;
            document.documentElement.style.setProperty('--bg', t.bg);
            document.documentElement.style.setProperty('--fg', t.fg);
            document.documentElement.style.setProperty('--menu', t.menu);
            document.documentElement.style.setProperty('--hil', t.accent);
            
            if (globalThis.myCodeMirror) {
                globalThis.myCodeMirror.setOption('theme', t.cm);
                document.getElementById('editor').style.backgroundColor = t.bg;
            }
            if (globalThis.term) {
                const termEl = document.querySelector('#terminal .terminal');
                if (termEl) {
                    termEl.style.setProperty('--background', t.bg, 'important');
                    termEl.style.setProperty('--color', t.fg, 'important');
                    termEl.style.backgroundColor = t.bg;
                }
            }
        },
        updateFontSize() {
            localStorage.setItem('fontSize', this.fontSize);
            if (globalThis.myCodeMirror) {
                globalThis.myCodeMirror.getWrapperElement().style.fontSize = this.fontSize + 'px';
                globalThis.myCodeMirror.refresh();
            }
            if (globalThis.term) {
                document.querySelector('#terminal').style.fontSize = this.fontSize + 'px';
            }
        },
        toggleLineNumbers() {
            this.lineNumbers = !this.lineNumbers;
            localStorage.setItem('lineNumbers', this.lineNumbers);
            this.updateLineNumbers();
        },
        updateLineNumbers() {
            if (globalThis.myCodeMirror) {
                globalThis.myCodeMirror.setOption('lineNumbers', this.lineNumbers);
            }
        },
        clearCodeCache() {
            const request = indexedDB.deleteDatabase('nuilithdb');
            request.onsuccess = () => {
                alert('Code cache cleared. Please reload to see default code.');
            };
        },
        clearSiteCache() {
            localStorage.clear();
            location.reload();
        },
        resetToDefaults() {
            this.theme = 'dark';
            this.fontSize = 16;
            this.lineNumbers = true;
            this.setTheme('dark');
            this.updateFontSize();
            if (!this.lineNumbers) this.toggleLineNumbers();
            localStorage.clear();
            alert('All settings reset to defaults.');
        }
    }));
});

window.addEventListener('load', async () => {
    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('sw.js');
            await navigator.serviceWorker.ready;
            
            if (!navigator.serviceWorker.controller) {
                location.reload(); 
                return;
            }

            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'INPUT_REQUEST') {
                    const port = event.ports[0];
                    if (!port) return;
                    globalThis.term.read("", (userInput) => {
                        const str = Array.isArray(userInput) && userInput.every(n => typeof n === 'number')
                            ? String.fromCharCode.apply(null, userInput)
                            : String(userInput ?? '').replace(/\r?\n$/, '');
                        port.postMessage(str);
                    });
                }
            });
        } catch (e) { console.error("SW failed", e); }
    }

    // 2. Terminal Initialization
    globalThis.term = $('#terminal').terminal(async function(command) {
        const cmd = command.trim();
        if (cmd === "run") runcode();
        else if (cmd === "clear") term.clear();
        else if (cmd === "help") term.echo("Commands: run, clear, help");
    }, {
        greetings: 'Nuilith Python',
        prompt: globalThis.nuilithPrompt
    });

    initWorker();

    // 4. Draggable divider between panes
    const container = document.getElementById('doublepanel');
    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('output');
    const divider = document.getElementById('divider');

    if (container && leftPane && rightPane && divider) {
        let isDragging = false;
        let startX = 0;
        let startLeftFraction = 0;

        const minPct = 20;
        const maxPct = 80;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const rect = container.getBoundingClientRect();
            if (rect.width <= 0) return;

            const delta = e.clientX - startX;
            let newLeftPx = startLeftFraction * rect.width + delta;
            let newLeftPct = (newLeftPx / rect.width) * 100;
            newLeftPct = Math.max(minPct, Math.min(maxPct, newLeftPct));

            leftPane.style.width = `${newLeftPct}%`;
            rightPane.style.width = `${100 - newLeftPct}%`;
        };

        const stopDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stopDrag);
        };

        divider.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = container.getBoundingClientRect();
            const leftRect = leftPane.getBoundingClientRect();

            startX = e.clientX;
            startLeftFraction = rect.width > 0 ? leftRect.width / rect.width : 0.5;

            document.body.style.userSelect = 'none';
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', stopDrag);
        });
    }

    // 5. CodeMirror Setup
    const editorpage = document.getElementById("editor");
    globalThis.myCodeMirror = CodeMirror(editorpage, {
        value: "print('Hello World')",
        mode: "python",
        theme: "programiz",
        lineNumbers: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-lint-markers"],
        lint: { getAnnotations: CodeMirror.lint.python || (() => []), async: true, delay: 600 },
        indentUnit: 4,
        extraKeys: {
            "Tab": (cm) => cm.replaceSelection("    ", "end"),
            "Ctrl-Enter": () => runcode(),
            "Ctrl-S": (cm) => { saveToIDB(); return false; },
            "Ctrl-Space": "autocomplete",
            "Esc": (cm) => cm.closeHint?.()
        }
    });

    // Auto-trigger hint dropdown when user types a dot
    globalThis.myCodeMirror.on("inputRead", function(cm, change) {
        if (change.text[0] === ".") {
            CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
        }
    });

    loadFromIDB();
    setupTimers();
});

function runcode() {
    term.clear();
    if (term.set_prompt) term.set_prompt('');
    if (window.ideStateData) window.ideStateData.running = true;
    pythonWorker.postMessage({ type: "RUN", code: myCodeMirror.getValue() });
}

function stopcode() {
    initWorker();
    if (window.ideStateData) window.ideStateData.running = false;
    term.set_prompt(globalThis.nuilithPrompt);
    term.echo('[[b;red;]Execution terminated.]');
}

function setupTimers() {
    setInterval(() => saveToIDB(), 30000);
}

function saveToIDB() {
    if (!myCodeMirror) return;
    const request = indexedDB.open('nuilithdb', 1);
    request.onupgradeneeded = (e) => {
        if (!e.target.result.objectStoreNames.contains('autosave')) {
            e.target.result.createObjectStore('autosave', { keyPath: 'id' });
        }
    };
    request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('autosave', 'readwrite');
        tx.objectStore('autosave').put({ id: 1, code: myCodeMirror.getValue() });
        tx.oncomplete = () => {
            globalThis.autosaveTime = Math.floor(Date.now() / 1000);
            db.close();
        };
    };
}

function loadFromIDB() {
    const request = indexedDB.open('nuilithdb', 1);
    request.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('autosave')) return;
        const tx = db.transaction('autosave', 'readonly');
        const getReq = tx.objectStore('autosave').get(1);
        getReq.onsuccess = () => {
            if (getReq.result && myCodeMirror) myCodeMirror.setValue(getReq.result.code);
        };
    };
}

function savecode() {
    const blob = new Blob([myCodeMirror.getValue()], { type: 'text/x-python' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'main.py';
    a.click();
}

async function loadcode() {
    try {
        const [handle] = await window.showOpenFilePicker();
        const file = await handle.getFile();
        myCodeMirror.setValue(await file.text());
    } catch (e) {}
}

window.addEventListener('beforeunload', () => {
    saveToIDB();
});
