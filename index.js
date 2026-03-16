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

// ===== IDB Constants =====
const DB_NAME = 'nuilithdb';
const DB_VERSION = 2;
const FILES_STORE = 'files';
const OLD_STORE = 'autosave';

// ===== Toast System =====
function showToast(message, type = 'info') {
    // check if feature is enabled
    if (window.ideStateData && !window.ideStateData.featureToasts) {
        alert(message);
        return;
    }

    const container = document.getElementById('toast-container');
    if (!container) { alert(message); return; }

    const alertClasses = {
        info:    'alert-info',
        success: 'alert-success',
        warning: 'alert-warning',
        error:   'alert-error'
    };

    const toast = document.createElement('div');
    toast.className = `alert ${alertClasses[type] || 'alert-info'} shadow-lg transition-all duration-300 opacity-0 translate-x-4`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-x-4');
        toast.classList.add('opacity-100', 'translate-x-0');
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-4');
        toast.classList.remove('opacity-100', 'translate-x-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== IndexedDB File System =====
function openFilesDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;

            // Create new files store if it doesn't exist
            if (!db.objectStoreNames.contains(FILES_STORE)) {
                db.createObjectStore(FILES_STORE, { keyPath: 'filename' });
            }
        };

        request.onsuccess = (e) => {
            const db = e.target.result;
            // Defensive: if the files store doesn't exist (stale DB), 
            // delete and re-create to trigger onupgradeneeded
            if (!db.objectStoreNames.contains(FILES_STORE)) {
                db.close();
                const delReq = indexedDB.deleteDatabase(DB_NAME);
                delReq.onsuccess = () => {
                    // Re-open, this time onupgradeneeded will fire
                    const retry = indexedDB.open(DB_NAME, DB_VERSION);
                    retry.onupgradeneeded = (ev) => {
                        const newDb = ev.target.result;
                        if (!newDb.objectStoreNames.contains(FILES_STORE)) {
                            newDb.createObjectStore(FILES_STORE, { keyPath: 'filename' });
                        }
                    };
                    retry.onsuccess = (ev) => resolve(ev.target.result);
                    retry.onerror = (ev) => reject(ev.target.error);
                };
                delReq.onerror = () => reject(new Error('Failed to delete stale DB'));
                return;
            }
            resolve(db);
        };

        request.onerror = (e) => reject(e.target.error);
    });
}

async function migrateOldData() {
    try {
        // Try opening old DB version to read data
        const oldReq = indexedDB.open(DB_NAME, DB_VERSION);
        const db = await new Promise((resolve, reject) => {
            oldReq.onsuccess = (e) => resolve(e.target.result);
            oldReq.onerror = (e) => reject(e.target.error);
        });

        if (!db.objectStoreNames.contains(OLD_STORE)) {
            db.close();
            return null;
        }

        // Check if files store already has data
        const tx = db.transaction([FILES_STORE], 'readonly');
        const filesStore = tx.objectStore(FILES_STORE);
        const count = await new Promise((resolve) => {
            const req = filesStore.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(0);
        });

        if (count > 0) {
            db.close();
            return null; // Already migrated
        }

        // Read old autosave data
        const oldTx = db.transaction([OLD_STORE], 'readonly');
        const oldStore = oldTx.objectStore(OLD_STORE);
        const oldData = await new Promise((resolve) => {
            const req = oldStore.get(1);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });

        if (oldData && oldData.code) {
            // Write to new files store
            const writeTx = db.transaction([FILES_STORE], 'readwrite');
            writeTx.objectStore(FILES_STORE).put({
                filename: 'main.py',
                code: oldData.code,
                active: true
            });
            await new Promise((resolve, reject) => {
                writeTx.oncomplete = resolve;
                writeTx.onerror = reject;
            });
        }

        db.close();
        return oldData?.code || null;
    } catch (err) {
        console.warn('Migration check failed (OK on first load):', err);
        return null;
    }
}

async function getAllFiles() {
    try {
        const db = await openFilesDB();
        const tx = db.transaction(FILES_STORE, 'readonly');
        const store = tx.objectStore(FILES_STORE);
        const files = await new Promise((resolve) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
        });
        db.close();
        return files;
    } catch {
        return [];
    }
}

async function getFile(filename) {
    try {
        const db = await openFilesDB();
        const tx = db.transaction(FILES_STORE, 'readonly');
        const store = tx.objectStore(FILES_STORE);
        const file = await new Promise((resolve) => {
            const req = store.get(filename);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
        db.close();
        return file;
    } catch {
        return null;
    }
}

async function saveFile(filename, code, active = false) {
    try {
        const db = await openFilesDB();
        const tx = db.transaction(FILES_STORE, 'readwrite');
        tx.objectStore(FILES_STORE).put({ filename, code, active });
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
        db.close();
    } catch (err) {
        console.error('Error saving file:', err);
    }
}

async function deleteFileFromDB(filename) {
    try {
        const db = await openFilesDB();
        const tx = db.transaction(FILES_STORE, 'readwrite');
        tx.objectStore(FILES_STORE).delete(filename);
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
        db.close();
    } catch (err) {
        console.error('Error deleting file:', err);
    }
}

async function setActiveFile(filename) {
    try {
        const db = await openFilesDB();
        const tx = db.transaction(FILES_STORE, 'readwrite');
        const store = tx.objectStore(FILES_STORE);
        const all = await new Promise((resolve) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
        });
        for (const f of all) {
            f.active = (f.filename === filename);
            store.put(f);
        }
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
        db.close();
    } catch (err) {
        console.error('Error setting active file:', err);
    }
}

// ===== Worker Init =====
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
        // Micropip handlers
        if (type === "INSTALL_SUCCESS") {
            if (window.ideStateData) {
                window.ideStateData.installedPackages = event.data.installedPackages || [];
                window.ideStateData.installingPackage = false;
            }
            showToast(`Package "${event.data.package}" installed successfully!`, 'success');
        }
        if (type === "INSTALL_ERROR") {
            if (window.ideStateData) window.ideStateData.installingPackage = false;
            showToast(`Failed to install "${event.data.package}": ${event.data.error}`, 'error');
        }
        if (type === "PACKAGE_LIST") {
            if (window.ideStateData) {
                window.ideStateData.installedPackages = event.data.installedPackages || [];
            }
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

// ===== Alpine.js State =====
document.addEventListener('alpine:init', () => {
    Alpine.data('ideState', () => ({
        settingsOpen: false,
        running: false,
        packagesOpen: false,
        packageName: '',
        installedPackages: [],
        installingPackage: false,

        // Feature toggles
        newUI: localStorage.getItem('newUI') !== 'false',
        featureTabs: localStorage.getItem('featureTabs') !== 'false',
        featurePackages: localStorage.getItem('featurePackages') !== 'false',
        featureToasts: localStorage.getItem('featureToasts') !== 'false',

        // Editor settings
        theme: localStorage.getItem('theme') || 'dark',
        fontSize: parseInt(localStorage.getItem('fontSize')) || 16,
        lineNumbers: localStorage.getItem('lineNumbers') !== 'false',
        keybindings: localStorage.getItem('keybindings') || 'default',

        // File system
        files: [],
        activeFile: 'main.py',
        renamingFile: null,
        renameValue: '',

        themes: [
            { id: 'dark', name: 'Dark (Default)', preview: '#1c2130' },
            { id: 'light', name: 'Light', preview: '#f8fafc' },
            { id: 'nord-dark', name: 'Nord Dark', preview: '#2e3440' },
            { id: 'nord-light', name: 'Nord Light', preview: '#e5e9f0' },
            { id: 'dark-red', name: 'Dark Red', preview: '#2d1a1a' },
            { id: 'light-red', name: 'Light Red', preview: '#fff5f5' },
            { id: 'amoled', name: 'AMOLED', preview: '#000000' }
        ],

        async init() {
            window.ideStateData = this;
            this.applyTheme();
            this.updateFontSize();
            this.updateLineNumbers();

            // Load files from IDB
            await migrateOldData();
            let files = await getAllFiles();
            if (files.length === 0) {
                // First time - create default file
                await saveFile('main.py', "print('Hello World')", true);
                files = [{ filename: 'main.py', code: "print('Hello World')", active: true }];
            }
            this.files = files.map(f => ({ name: f.filename, active: f.active }));
            const activeF = files.find(f => f.active);
            this.activeFile = activeF ? activeF.filename : files[0].filename;

            // Load active file into editor
            const fileData = await getFile(this.activeFile);
            if (fileData && globalThis.myCodeMirror) {
                globalThis.myCodeMirror.setValue(fileData.code);
            }

            // Apply keybindings
            this.applyKeybindings();
        },

        // ---- Feature Toggle Methods ----
        toggleNewUI() {
            this.newUI = !this.newUI;
            localStorage.setItem('newUI', this.newUI);
            if (!this.newUI) {
                // Store previous sub-feature states before disabling
                localStorage.setItem('_prevFeatureTabs', this.featureTabs);
                localStorage.setItem('_prevFeaturePackages', this.featurePackages);
                localStorage.setItem('_prevFeatureToasts', this.featureToasts);
                this.featureTabs = false;
                this.featurePackages = false;
                this.featureToasts = false;
            } else {
                // Restore previous sub-feature states
                this.featureTabs = localStorage.getItem('_prevFeatureTabs') !== 'false';
                this.featurePackages = localStorage.getItem('_prevFeaturePackages') !== 'false';
                this.featureToasts = localStorage.getItem('_prevFeatureToasts') !== 'false';
            }
            this.persistFeatureToggles();
        },

        toggleFeatureTabs() {
            this.featureTabs = !this.featureTabs;
            this.persistFeatureToggles();
        },

        toggleFeaturePackages() {
            this.featurePackages = !this.featurePackages;
            this.persistFeatureToggles();
        },

        toggleFeatureToasts() {
            this.featureToasts = !this.featureToasts;
            this.persistFeatureToggles();
        },

        persistFeatureToggles() {
            localStorage.setItem('featureTabs', this.featureTabs);
            localStorage.setItem('featurePackages', this.featurePackages);
            localStorage.setItem('featureToasts', this.featureToasts);
        },

        // ---- Theme Methods ----
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

        // ---- Editor Methods ----
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

        // ---- Keybinding Methods ----
        setKeybindings(mode) {
            this.keybindings = mode;
            localStorage.setItem('keybindings', mode);
            this.applyKeybindings();
        },
        applyKeybindings() {
            if (!globalThis.myCodeMirror) return;
            globalThis.myCodeMirror.setOption('keyMap', this.keybindings);
        },

        // ---- File Management Methods ----
        async switchFile(filename) {
            if (filename === this.activeFile) return;
            // Save current file first
            await this.saveCurrentFile();
            // Load new file
            const file = await getFile(filename);
            if (file && globalThis.myCodeMirror) {
                globalThis.myCodeMirror.setValue(file.code);
            }
            this.activeFile = filename;
            this.files = this.files.map(f => ({ ...f, active: f.name === filename }));
            await setActiveFile(filename);
        },

        async createNewFile() {
            let name = 'untitled.py';
            let counter = 1;
            const existingNames = this.files.map(f => f.name);
            while (existingNames.includes(name)) {
                name = `untitled${counter}.py`;
                counter++;
            }
            await this.saveCurrentFile();
            await saveFile(name, '', true);
            this.files.push({ name, active: true });
            this.files = this.files.map(f => ({ ...f, active: f.name === name }));
            this.activeFile = name;
            if (globalThis.myCodeMirror) globalThis.myCodeMirror.setValue('');
            await setActiveFile(name);
            showToast(`Created ${name}`, 'success');
        },

        startRename(filename) {
            this.renamingFile = filename;
            this.renameValue = filename;
        },

        async finishRename() {
            const oldName = this.renamingFile;
            let newName = this.renameValue.trim();
            this.renamingFile = null;
            if (!newName || newName === oldName) return;
            if (!newName.endsWith('.py')) newName += '.py';
            if (this.files.some(f => f.name === newName)) {
                showToast(`File "${newName}" already exists`, 'warning');
                return;
            }
            // Get old file data
            const fileData = await getFile(oldName);
            const code = fileData ? fileData.code : '';
            const wasActive = this.activeFile === oldName;
            // Delete old, create new
            await deleteFileFromDB(oldName);
            await saveFile(newName, code, wasActive);
            this.files = this.files.map(f =>
                f.name === oldName ? { name: newName, active: wasActive } : f
            );
            if (wasActive) this.activeFile = newName;
            showToast(`Renamed to ${newName}`, 'success');
        },

        cancelRename() {
            this.renamingFile = null;
        },

        async deleteFile(filename) {
            if (this.files.length <= 1) {
                showToast('Cannot delete the last file', 'warning');
                return;
            }
            if (!confirm(`Delete "${filename}"?`)) return;
            await deleteFileFromDB(filename);
            this.files = this.files.filter(f => f.name !== filename);
            if (this.activeFile === filename) {
                const newActive = this.files[0].name;
                await this.switchFile(newActive);
            }
            showToast(`Deleted ${filename}`, 'info');
        },

        async saveCurrentFile() {
            if (!globalThis.myCodeMirror) return;
            await saveFile(this.activeFile, globalThis.myCodeMirror.getValue(), true);
            globalThis.autosaveTime = Math.floor(Date.now() / 1000);
        },

        // ---- Packages Methods ----
        openPackages() {
            this.packagesOpen = true;
            if (pythonWorker) {
                pythonWorker.postMessage({ type: "LIST_PACKAGES" });
            }
        },

        installPackage() {
            const pkg = this.packageName.trim();
            if (!pkg) return;
            this.installingPackage = true;
            pythonWorker.postMessage({ type: "INSTALL", package: pkg });
            this.packageName = '';
        },

        // ---- System Maintenance ----
        clearCodeCache() {
            const request = indexedDB.deleteDatabase(DB_NAME);
            request.onsuccess = () => {
                showToast('Code cache cleared. Please reload to see default code.', 'info');
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
            this.keybindings = 'default';
            this.newUI = true;
            this.featureTabs = true;
            this.featurePackages = true;
            this.featureToasts = true;
            this.setTheme('dark');
            this.updateFontSize();
            if (!this.lineNumbers) this.toggleLineNumbers();
            this.applyKeybindings();
            this.persistFeatureToggles();
            localStorage.setItem('newUI', true);
            localStorage.setItem('keybindings', 'default');
            showToast('All settings reset to defaults.', 'info');
        }
    }));
});

// ===== Window Load =====
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
            "Ctrl-S": (cm) => { saveCurrentFileDirect(); return false; },
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
    setInterval(() => saveCurrentFileDirect(), 30000);
}

async function saveCurrentFileDirect() {
    if (!myCodeMirror || !window.ideStateData) return;
    await saveFile(window.ideStateData.activeFile, myCodeMirror.getValue(), true);
    globalThis.autosaveTime = Math.floor(Date.now() / 1000);
}

function savecode() {
    const filename = window.ideStateData ? window.ideStateData.activeFile : 'main.py';
    const blob = new Blob([myCodeMirror.getValue()], { type: 'text/x-python' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
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
    saveCurrentFileDirect();
});
