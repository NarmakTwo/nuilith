/**
 * Nuilith IDE: Main UI Controller
 * This script orchestrates the Alpine.js reactive state, 
 * CodeMirror editor, and communication with the Web Worker.
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
const DB_VERSION = 3;
const PROJECTS_STORE = 'projects';
let openFilesDB = null;

// ===== Toast System =====
function showToast(message, type = 'info') {
    if (window.ideStateData && !window.ideStateData.featureToasts) {
        alert(message);
        return;
    }
    const container = document.getElementById('toast-container');
    if (!container) { alert(message); return; }

    const alertClasses = {
        info: 'alert-info',
        success: 'alert-success',
        warning: 'alert-warning',
        error: 'alert-error'
    };

    const toast = document.createElement('div');
    toast.className = `alert ${alertClasses[type] || 'alert-info'} shadow-lg transition-all duration-300 opacity-0 translate-x-4`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-x-4');
        toast.classList.add('opacity-100', 'translate-x-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-4');
        toast.classList.remove('opacity-100', 'translate-x-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Worker Init =====
function initWorker() {
    if (pythonWorker) pythonWorker.terminate();
    pythonWorker = new Worker('worker.js');
    pythonWorker.onmessage = (event) => {
        const { type, text, annotations } = event.data;
        if (type === "READY") {
            // Re-install packages if any were saved
            const saved = localStorage.getItem('installedPackages');
            if (saved) {
                const packages = JSON.parse(saved);
                if (packages.length > 0) {
                    pythonWorker.postMessage({ type: "INSTALL", package: packages, isSilent: true });
                }
            }
        }
        if (type === "LINT_RESULT" && pendingLintCallback) {
            pendingLintCallback(event.data.id ?? 0, annotations);
            pendingLintCallback = null;
        }
        if (type === "PRINT" || type === "ERROR") {
            if (text.includes('\x1b[2J') || text.includes('\u001b[2J')) {
                term.clear();
                // Strip the clear sequence and echo the rest
                const cleaned = text.replace(/\x1b\[2J|\u001b\[2J/g, '');
                if (cleaned) {
                    if (type === "PRINT") term.echo(cleaned, { newline: false });
                    else term.error(cleaned, { newline: false });
                }
            } else {
                if (type === "PRINT") term.echo(text, { newline: false });
                else term.error(text, { newline: false });
            }
            if (type === "ERROR") {
                term.set_prompt(globalThis.nuilithPrompt);
                if (window.ideStateData) window.ideStateData.running = false;
            }
        }
        if (type === "CLEAR") term.clear();
        if (type === "FINISHED") {
            term.set_prompt(globalThis.nuilithPrompt);
            if (window.ideStateData) window.ideStateData.running = false;
        }
        // Micropip handlers
        if (type === "INSTALL_SUCCESS") {
            if (window.ideStateData) {
                window.ideStateData.installedPackages = event.data.installedPackages || [];
                window.ideStateData.installingPackage = false;
                // Persist to localStorage
                localStorage.setItem('installedPackages', JSON.stringify(window.ideStateData.installedPackages));
            }
            if (!event.data.isSilent) {
                showToast(`Package "${event.data.package}" installed successfully!`, 'success');
            }
        }
        if (type === "INSTALL_ERROR") {
            if (window.ideStateData) window.ideStateData.installingPackage = false;
            if (!event.data.isSilent) {
                showToast(`Failed to install "${event.data.package}": ${event.data.error}`, 'error');
            }
        }
        if (type === "PACKAGE_LIST") {
            if (window.ideStateData) {
                window.ideStateData.installedPackages = event.data.installedPackages || [];
                localStorage.setItem('installedPackages', JSON.stringify(window.ideStateData.installedPackages));
            }
        }
    };
}

// Python lint: pyflakes via worker (async)
const pythonLint = function (text, callback) {
    if (!pythonWorker) return;
    const id = ++lintRequestId;
    pendingLintCallback = (resultId, annotations) => {
        if (id === resultId) callback(annotations);
    };
    pythonWorker.postMessage({ type: "LINT", code: text, id });
};
pythonLint.async = true;
CodeMirror.registerHelper("lint", "python", pythonLint);

/**
 * Alpine.js State Management
 * This object holds all reactive data for the IDE, 
 * including settings, project files, and application state.
 */
document.addEventListener('alpine:init', () => {
    Alpine.data('ideState', () => ({
        settingsOpen: false,
        running: false,
        packagesOpen: false,
        packageName: '',
        installedPackages: [],
        installingPackage: false,
        isLoaded: false,

        // PWA Install and File Launch statuses
        canInstall: false,
        deferredPrompt: null,

        // Feature toggles
        newUI: localStorage.getItem('newUI') !== 'false',
        featureTabs: localStorage.getItem('featureTabs') !== 'false',
        featurePackages: localStorage.getItem('featurePackages') !== 'false',
        featureToasts: localStorage.getItem('featureToasts') !== 'false',
        zenMode: false,

        // Editor settings
        theme: localStorage.getItem('theme') || 'dark',
        fontSize: parseInt(localStorage.getItem('fontSize')) || 16,
        lineNumbers: localStorage.getItem('lineNumbers') !== 'false',
        keybindings: localStorage.getItem('keybindings') || 'default',
        lineWrapping: localStorage.getItem('lineWrapping') === 'true',
        codeFolding: localStorage.getItem('codeFolding') !== 'false',
        bracketMastery: localStorage.getItem('bracketMastery') !== 'false',
        activeLineHighlight: localStorage.getItem('activeLineHighlight') !== 'false',
        inRepl: false,

        // Project system (.nu)
        currentProject: localStorage.getItem('currentProject') || 'default',
        projectsList: [],

        // Project Action Modal State
        projectActionTitle: '',
        projectActionMessage: '',
        projectActionType: '',
        projectActionSubmitText: '',
        projectActionCallback: null,
        projectActionInput: '',

        // File system
        files: [],
        activeFile: 'main.py',
        renamingFile: null,
        renameValue: '',

        themes: [
            { id: 'dark', name: 'Dark (Default)', bg: '#1c2130', fg: '#ffffff', keyword: '#c678dd', func: '#61afef', string: '#98c379' },
            { id: 'light', name: 'Light', bg: '#f8fafc', fg: '#1e293b', keyword: '#d73a49', func: '#6f42c1', string: '#032f62' },
            { id: 'nord-dark', name: 'Nord Dark', bg: '#2e3440', fg: '#eceff4', keyword: '#81a1c1', func: '#88c0d0', string: '#a3be8c' },
            { id: 'nord-light', name: 'Nord Light', bg: '#e5e9f0', fg: '#2e3440', keyword: '#5e81ac', func: '#81a1c1', string: '#a3be8c' },
            { id: 'dark-red', name: 'Dark Red', bg: '#1a0f0f', fg: '#ff9999', keyword: '#ef4444', func: '#fca5a5', string: '#f87171' },
            { id: 'dracula', name: 'Dracula', bg: '#282a36', fg: '#f8f8f2', keyword: '#ff79c6', func: '#50fa7b', string: '#f1fa8c' },
            { id: 'material', name: 'Material', bg: '#263238', fg: '#eeffff', keyword: '#c792ea', func: '#82aaff', string: '#c3e88d' },
            { id: 'monokai', name: 'Monokai', bg: '#272822', fg: '#f8f8f2', keyword: '#f92672', func: '#a6e22e', string: '#e6db74' },
            { id: 'solarized-dark', name: 'Solarized Dark', bg: '#002b36', fg: '#839496', keyword: '#859900', func: '#268bd2', string: '#2aa198' },
            { id: 'solarized-light', name: 'Solarized Light', bg: '#fdf6e3', fg: '#657b83', keyword: '#859900', func: '#268bd2', string: '#2aa198' },
            { id: 'idea', name: 'IDEA', bg: '#ffffff', fg: '#000000', keyword: '#000080', func: '#000000', string: '#008000' },
            { id: 'vscode-dark', name: 'VSCode Dark', bg: '#1e1e1e', fg: '#d4d4d4', keyword: '#569cd6', func: '#dcdcaa', string: '#ce9178' },
            { id: 'github-dark', name: 'GitHub Dark', bg: '#0d1117', fg: '#c9d1d9', keyword: '#ff7b72', func: '#d2a8ff', string: '#a5d6ff' },
            { id: 'github-light', name: 'GitHub Light', bg: '#ffffff', fg: '#24292f', keyword: '#cf222e', func: '#8250df', string: '#0a3069' },
            { id: 'replit-dark', name: 'Replit Dark', bg: '#0e1525', fg: '#f5f9fc', keyword: '#ff5c5c', func: '#5c94ff', string: '#38b584' },
            { id: 'hc-black', name: 'High Contrast', bg: '#000000', fg: '#ffffff', keyword: '#ffff00', func: '#00ff00', string: '#ff0000' }
        ],

        /**
         * Initialization lifecycle for the IDE.
         * Apples initial themes, sizes, and establishes the IndexedDB connection.
         */
        async init() {
            window.ideStateData = this;
            this.applyTheme();
            this.updateFontSize();
            this.updateLineNumbers();
            // Minor delay to ensure editor is ready for highlight application.
            setTimeout(() => this.applyActiveLineHighlight(), 500);

            await this.initDB();
            await this.loadProjectList();
            // Automatically switch to the last used project on first load.
            await this.switchProject(this.currentProject, true); 

            this.applyKeybindings();

            // PWA Install Prompt Listener
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
                this.canInstall = true;
            });

            // File Handling API (LaunchQueue)
            if ('launchQueue' in window) {
                window.launchQueue.setConsumer(async (launchParams) => {
                    if (launchParams.files && launchParams.files.length > 0) {
                        for (const handle of launchParams.files) {
                            const file = await handle.getFile();
                            await this.processFileHandle(file);
                        }
                    }
                });
            }
        },

        // ---- Database & Project System ----
        async initDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('files')) {
                        db.createObjectStore('files', { keyPath: 'filename' }); // Legacy flat store
                    }
                    if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
                        db.createObjectStore(PROJECTS_STORE, { keyPath: 'projectName' }); // New multi-project store
                    }
                };
                request.onsuccess = async (event) => {
                    openFilesDB = event.target.result;

                    // Migration check:
                    const pTx = openFilesDB.transaction([PROJECTS_STORE], 'readonly');
                    const defReq = pTx.objectStore(PROJECTS_STORE).get('default');

                    defReq.onsuccess = async () => {
                        if (!defReq.result) {
                            console.log("Migrating legacy flat files to 'default' project...");
                            const fTx = openFilesDB.transaction(['files'], 'readonly');
                            const allFilesReq = fTx.objectStore('files').getAll();
                            allFilesReq.onsuccess = () => {
                                let filesToMigrate = allFilesReq.result || [];
                                if (filesToMigrate.length === 0) {
                                    filesToMigrate = [{ filename: 'main.py', active: true, code: 'print("Hello World")' }];
                                }

                                // Mapping old {filename, code, active} -> new {name, code, active} 
                                // to match our updated memory structure
                                const mappedFiles = filesToMigrate.map(f => ({ name: f.filename, active: f.active, code: f.code }));
                                const packagesToMigrate = JSON.parse(localStorage.getItem('installedPackages') || '[]');

                                const wTx = openFilesDB.transaction([PROJECTS_STORE], 'readwrite');
                                wTx.objectStore(PROJECTS_STORE).put({
                                    projectName: 'default',
                                    files: mappedFiles,
                                    packages: packagesToMigrate
                                });
                                wTx.oncomplete = () => resolve();
                            };
                        } else {
                            resolve(); // Already migrated
                        }
                    };
                };
                request.onerror = (e) => reject(e);
            });
        },

        async loadProjectList() {
            return new Promise(resolve => {
                const tx = openFilesDB.transaction([PROJECTS_STORE], 'readonly');
                const req = tx.objectStore(PROJECTS_STORE).getAllKeys();
                req.onsuccess = () => {
                    this.projectsList = req.result || ['default'];
                    resolve();
                }
            });
        },

        async saveCurrentProjectToDB() {
            if (!openFilesDB || !this.isLoaded) return;
            if (globalThis.myCodeMirror) {
                const idx = this.files.findIndex(f => f.name === this.activeFile);
                if (idx > -1) this.files[idx].code = globalThis.myCodeMirror.getValue();
            }
            return new Promise(resolve => {
                const tx = openFilesDB.transaction([PROJECTS_STORE], 'readwrite');
                tx.objectStore(PROJECTS_STORE).put({
                    projectName: this.currentProject,
                    files: JSON.parse(JSON.stringify(this.files)),
                    packages: JSON.parse(JSON.stringify(this.installedPackages))
                });
                tx.oncomplete = () => resolve();
            });
        },

        async switchProject(projName, isFirstLoad = false) {
            if (!isFirstLoad && this.currentProject === projName) return;
            if (!isFirstLoad) await this.saveCurrentProjectToDB();

            this.currentProject = projName;
            localStorage.setItem('currentProject', projName);

            await new Promise(resolve => {
                const tx = openFilesDB.transaction([PROJECTS_STORE], 'readonly');
                const req = tx.objectStore(PROJECTS_STORE).get(this.currentProject);
                req.onsuccess = () => {
                    if (req.result) {
                        this.files = req.result.files;
                        this.installedPackages = req.result.packages || [];
                        localStorage.setItem('installedPackages', JSON.stringify(this.installedPackages));

                        const activeF = this.files.find(f => f.active);
                        this.activeFile = activeF ? activeF.name : this.files[0].name;
                        if (globalThis.myCodeMirror) {
                            const target = this.files.find(f => f.name === this.activeFile);
                            globalThis.myCodeMirror.setValue(target ? target.code : '');
                        }
                    } else {
                        // Safe fallback
                        this.files = [{ name: 'main.py', active: true, code: 'print("Hello World")' }];
                        this.installedPackages = [];
                    }
                    this.isLoaded = true;
                    resolve();
                };
                req.onerror = () => {
                    this.isLoaded = true;
                    resolve();
                };
            });

            // Re-install packages for new project seamlessly
            if (globalThis.pythonWorker && this.installedPackages.length > 0) {
                globalThis.pythonWorker.postMessage({ type: "INSTALL", package: this.installedPackages, isSilent: true });
            }

            if (!isFirstLoad) showToast(`Switched to project: ${projName}`, 'success');
        },

        openProjectAction(action, target = null) {
            document.activeElement.blur(); // Dropdown cleanup
            if (action === 'new') {
                this.projectActionTitle = 'New Project';
                this.projectActionMessage = 'Enter new project name:';
                this.projectActionType = 'prompt';
                this.projectActionInput = '';
                this.projectActionSubmitText = 'Create';
                this.projectActionCallback = async () => {
                    const newName = this.projectActionInput.trim();
                    if (!newName) return;
                    if (this.projectsList.includes(newName)) {
                        showToast('Project already exists!', 'error');
                        return;
                    }
                    await this.saveCurrentProjectToDB();
                    const tx = openFilesDB.transaction([PROJECTS_STORE], 'readwrite');
                    tx.objectStore(PROJECTS_STORE).put({
                        projectName: newName,
                        files: [{ name: 'main.py', active: true, code: '# New Project' }],
                        packages: []
                    });
                    tx.oncomplete = async () => {
                        await this.loadProjectList();
                        this.switchProject(newName);
                    };
                    document.getElementById('project_action_modal').close();
                };
            } else if (action === 'rename') {
                this.projectActionTitle = 'Rename Project';
                this.projectActionMessage = `Rename project "${this.currentProject}" to:`;
                this.projectActionType = 'prompt';
                this.projectActionInput = this.currentProject;
                this.projectActionSubmitText = 'Rename';
                this.projectActionCallback = async () => {
                    const newName = this.projectActionInput.trim();
                    if (!newName || newName === this.currentProject) return;
                    if (this.projectsList.includes(newName)) {
                        showToast('Name taken!', 'error');
                        return;
                    }
                    await this.saveCurrentProjectToDB();
                    const tx = openFilesDB.transaction([PROJECTS_STORE], 'readwrite');
                    const store = tx.objectStore(PROJECTS_STORE);
                    const getReq = store.get(this.currentProject);
                    getReq.onsuccess = () => {
                        const data = getReq.result;
                        data.projectName = newName;
                        store.put(data);
                        store.delete(this.currentProject);
                    };
                    tx.oncomplete = async () => {
                        this.currentProject = newName;
                        localStorage.setItem('currentProject', newName);
                        await this.loadProjectList();
                        showToast(`Project renamed to ${newName}`, 'success');
                    };
                    document.getElementById('project_action_modal').close();
                };
            } else if (action === 'delete') {
                if (this.projectsList.length <= 1) {
                    showToast('Cannot delete the only project.', 'error');
                    return;
                }
                this.projectActionTitle = 'Delete Project';
                this.projectActionMessage = `Are you sure you want to delete project "${this.currentProject}"? This action cannot be undone.`;
                this.projectActionType = 'delete';
                this.projectActionSubmitText = 'Delete';
                this.projectActionCallback = async () => {
                    const tx = openFilesDB.transaction([PROJECTS_STORE], 'readwrite');
                    tx.objectStore(PROJECTS_STORE).delete(this.currentProject);
                    tx.oncomplete = async () => {
                        await this.loadProjectList();
                        const newProj = this.projectsList[0];
                        this.currentProject = newProj;
                        localStorage.setItem('currentProject', newProj);
                        this.switchProject(newProj, true);
                        showToast('Project deleted', 'success');
                    };
                    document.getElementById('project_action_modal').close();
                };
            } else if (action === 'delete-file') {
                if (this.files.length <= 1) {
                    showToast('Cannot delete the last file', 'warning');
                    return;
                }
                this.projectActionTitle = 'Delete File';
                this.projectActionMessage = `Are you sure you want to delete file "${target}"?`;
                this.projectActionType = 'delete';
                this.projectActionSubmitText = 'Delete';
                this.projectActionCallback = async () => {
                    if (this.activeFile === target) {
                        const newActive = this.files.find(f => f.name !== target).name;
                        await this.switchFile(newActive);
                    }
                    this.files = this.files.filter(f => f.name !== target);
                    await this.saveCurrentProjectToDB();
                    showToast(`Deleted ${target}`, 'info');
                    document.getElementById('project_action_modal').close();
                };
            }
            document.getElementById('project_action_modal').showModal();
            // Automatically focus input if it's a prompt
            if (this.projectActionType === 'prompt') {
                setTimeout(() => document.getElementById('project_action_input').focus(), 100);
            }
        },

        submitProjectAction() {
            if (this.projectActionCallback) {
                this.projectActionCallback();
            }
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

        toggleLineWrap() {
            localStorage.setItem('lineWrapping', this.lineWrapping);
            if (globalThis.myCodeMirror) globalThis.myCodeMirror.setOption('lineWrapping', this.lineWrapping);
        },
        toggleCodeFolding() {
            localStorage.setItem('codeFolding', this.codeFolding);
            if (globalThis.myCodeMirror) globalThis.myCodeMirror.setOption('foldGutter', this.codeFolding);
        },
        toggleBracketMastery() {
            localStorage.setItem('bracketMastery', this.bracketMastery);
            if (globalThis.myCodeMirror) {
                globalThis.myCodeMirror.setOption('matchBrackets', this.bracketMastery);
                globalThis.myCodeMirror.setOption('autoCloseBrackets', this.bracketMastery);
            }
        },
        toggleActiveLine() {
            localStorage.setItem('activeLineHighlight', this.activeLineHighlight);
            this.applyActiveLineHighlight();
        },
        applyActiveLineHighlight() {
            if (!globalThis.myCodeMirror) return;
            globalThis.myCodeMirror.setOption('styleActiveLine', this.activeLineHighlight);
            globalThis.myCodeMirror.getWrapperElement().classList.remove('hide-active-line');
        },
        startRepl() {
            this.inRepl = !this.inRepl;
            if (this.inRepl) {
                globalThis.term.set_prompt('>>> ');
                globalThis.term.echo('[[b;blue;]Python 3 Interactive REPL Started]');
                globalThis.term.echo('Type "exit()" or click Start REPL again to quit.');
            } else {
                globalThis.term.set_prompt(globalThis.nuilithPrompt);
                globalThis.term.echo('[[b;gray;]Exited REPL.]');
            }
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
                'amoled': { bg: '#000000', fg: '#ffffff', menu: '#111111', accent: '#3b82f6', cm: 'vibrant-ink' },
                'dracula': { bg: '#282a36', fg: '#f8f8f2', menu: '#21222c', accent: '#ff79c6', cm: 'dracula' },
                'material': { bg: '#263238', fg: '#eeffff', menu: '#1e272c', accent: '#80cbc4', cm: 'material' },
                'monokai': { bg: '#272822', fg: '#f8f8f2', menu: '#1e1f1c', accent: '#a6e22e', cm: 'monokai' },
                'solarized-dark': { bg: '#002b36', fg: '#839496', menu: '#001e26', accent: '#268bd2', cm: 'solarized dark' },
                'solarized-light': { bg: '#fdf6e3', fg: '#657b83', menu: '#eee8d5', accent: '#268bd2', cm: 'solarized light' },
                'idea': { bg: '#ffffff', fg: '#000000', menu: '#f5f5f5', accent: '#0000ff', cm: 'idea' },
                'vscode-dark': { bg: '#1e1e1e', fg: '#d4d4d4', menu: '#252526', accent: '#007acc', cm: 'moxer' },
                'github-dark': { bg: '#0d1117', fg: '#c9d1d9', menu: '#161b22', accent: '#58a6ff', cm: 'material-darker' },
                'github-light': { bg: '#ffffff', fg: '#24292f', menu: '#f6f8fa', accent: '#0969da', cm: 'eclipse' },
                'replit-dark': { bg: '#0e1525', fg: '#f5f9fc', menu: '#1c2333', accent: '#0084ff', cm: 'oceanic-next' },
                'hc-black': { bg: '#000000', fg: '#ffffff', menu: '#000000', accent: '#00ff00', cm: 'blackboard' }
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
            await this.saveCurrentFile(); // saves to code mirror and pushes to DB

            const file = this.files.find(f => f.name === filename);
            if (file && globalThis.myCodeMirror) {
                globalThis.myCodeMirror.setValue(file.code);
            }
            this.activeFile = filename;
            this.files = this.files.map(f => ({ ...f, active: f.name === filename }));
            await this.saveCurrentProjectToDB();
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
            this.files.push({ name, active: true, code: '' });
            this.files = this.files.map(f => ({ ...f, active: f.name === name }));
            this.activeFile = name;
            if (globalThis.myCodeMirror) globalThis.myCodeMirror.setValue('');
            await this.saveCurrentProjectToDB();
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

            const wasActive = this.activeFile === oldName;
            this.files = this.files.map(f =>
                f.name === oldName ? { ...f, name: newName, active: wasActive } : f
            );
            if (wasActive) this.activeFile = newName;
            await this.saveCurrentProjectToDB();
            showToast(`Renamed to ${newName}`, 'success');
        },

        cancelRename() {
            this.renamingFile = null;
        },

        async deleteFile(filename) {
            this.openProjectAction('delete-file', filename);
        },

        async saveCurrentFile() {
            if (!globalThis.myCodeMirror || !this.isLoaded) return;
            const idx = this.files.findIndex(f => f.name === this.activeFile);
            if (idx > -1) {
                this.files[idx].code = globalThis.myCodeMirror.getValue();
            }
            await this.saveCurrentProjectToDB();
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
            this.zenMode = false;
            this.setTheme('dark');
            this.updateFontSize();
            if (!this.lineNumbers) this.toggleLineNumbers();
            this.applyKeybindings();
            this.persistFeatureToggles();
            localStorage.setItem('newUI', true);
            localStorage.setItem('keybindings', 'default');
            showToast('All settings reset to defaults.', 'info');
        },

        // ---- Import / Export (.nu) ----
        savecode() { // export single file (.py)
            let filename = this.activeFile;
            if (!filename.endsWith('.py')) filename += '.py';
            const code = globalThis.myCodeMirror ? globalThis.myCodeMirror.getValue() : '';
            const blob = new Blob([code], { type: 'text/x-python' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
        },

        async exportProject() { // export .nu project
            await this.saveCurrentProjectToDB();
            const zip = new JSZip();
            for (let f of this.files) {
                zip.file(f.name, f.code);
            }
            zip.file('manifest.json', JSON.stringify({ packages: this.installedPackages || [] }, null, 2));

            const content = await zip.generateAsync({ type: "blob" });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = `${this.currentProject}.nu`;
            a.click();
            showToast(`Exported ${this.currentProject}.nu`, 'success');
        },

        async installPWA() {
            if (!this.deferredPrompt) return;
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                this.canInstall = false;
            }
            this.deferredPrompt = null;
        },

        async processFileHandle(file) {
            try {
                if (file.name.endsWith('.nu')) {
                    const zip = await JSZip.loadAsync(file);
                    const projName = file.name.replace('.nu', '');

                    let manifest = { packages: [] };
                    let importedFiles = [];

                    for (let relativePath in zip.files) {
                        if (relativePath === 'manifest.json') {
                            const mStr = await zip.file(relativePath).async('string');
                            manifest = JSON.parse(mStr);
                        } else if (relativePath.endsWith('.py')) {
                            const content = await zip.file(relativePath).async('string');
                            importedFiles.push({ name: relativePath, active: false, code: content });
                        }
                    }

                    if (importedFiles.length === 0) {
                        importedFiles = [{ name: 'main.py', active: true, code: '' }];
                    } else {
                        importedFiles[0].active = true;
                    }

                    if (this.projectsList.includes(projName)) {
                        this.collisionProjectName = projName;
                        this.renameProjectInput = projName + '_copy';
                        this.collisionTempData = { files: importedFiles, packages: manifest.packages || [] };
                        document.getElementById('project_collision_modal').showModal();
                    } else {
                        await this.saveImportedProject(projName, importedFiles, manifest.packages || []);
                    }

                } else if (file.name.endsWith('.py')) {
                    const text = await file.text();
                    if (!this.files.find(f => f.name === file.name)) {
                        this.files.push({ name: file.name, active: false, code: text });
                    } else {
                        const idx = this.files.findIndex(f => f.name === file.name);
                        this.files[idx].code = text;
                    }
                    this.switchFile(file.name);
                    this.saveCurrentProjectToDB();
                    showToast(`Imported ${file.name}`, 'success');
                }
            } catch (e) { console.error(e); showToast("Failed to process file.", 'error'); }
        },

        async loadcode() { // import file or project
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Python or Nuilith Project',
                        accept: { '*/*': ['.py', '.nu'] }
                    }]
                });
                const file = await handle.getFile();
                await this.processFileHandle(file);
            } catch (e) { console.error(e); }
        },

        async resolveCollision(action) {
            const modal = document.getElementById('project_collision_modal');
            const data = this.collisionTempData;
            const targetName = this.collisionProjectName;

            if (action === 'overwrite') {
                await this.saveImportedProject(targetName, data.files, data.packages);
                modal.close();
            } else if (action === 'rename') {
                const newName = this.renameProjectInput.trim();
                if (!newName) return;
                if (this.projectsList.includes(newName)) {
                    showToast('Name already taken!', 'error');
                    return;
                }
                await this.saveImportedProject(newName, data.files, data.packages);
                modal.close();
            } else {
                modal.close();
            }
            this.collisionTempData = null;
        },

        async saveImportedProject(name, files, packages) {
            const tx = openFilesDB.transaction([PROJECTS_STORE], 'readwrite');
            tx.objectStore(PROJECTS_STORE).put({
                projectName: name,
                files: files,
                packages: packages
            });
            tx.oncomplete = async () => {
                await this.loadProjectList();
                this.switchProject(name);
                showToast(`Project '${name}' imported successfully`, 'success');
            };
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
    globalThis.term = $('#terminal').terminal(async function (command) {
        const cmd = command.trim();
        if (window.ideStateData && window.ideStateData.inRepl) {
            if (cmd === "exit()" || cmd === "quit()" || cmd === "exit" || cmd === "quit") {
                window.ideStateData.startRepl();
                return;
            }
            if (cmd === "") return;
            pythonWorker.postMessage({ type: "EVAL_REPL", code: cmd });
            term.pause();
            return;
        }

        if (cmd === "run") runcode();
        else if (cmd === "clear") term.clear();
        else if (cmd === "python" || cmd === "python3") {
            if (window.ideStateData) window.ideStateData.startRepl();
        }
        else if (cmd === "help") term.echo("Commands: run, clear, python, help");
        else term.echo(`Command '${cmd}' not found`);
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
        value: (window.ideStateData && window.ideStateData.files.length > 0)
            ? (window.ideStateData.files.find(f => f.name === window.ideStateData.activeFile) || window.ideStateData.files[0]).code || ''
            : "print('Hello World')",
        mode: "python",
        theme: "programiz",
        lineNumbers: true,
        lineWrapping: window.ideStateData ? window.ideStateData.lineWrapping : false,
        foldGutter: window.ideStateData ? window.ideStateData.codeFolding : true,
        matchBrackets: window.ideStateData ? window.ideStateData.bracketMastery : true,
        autoCloseBrackets: window.ideStateData ? window.ideStateData.bracketMastery : true,
        styleActiveLine: window.ideStateData ? window.ideStateData.activeLineHighlight : true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
        lint: { getAnnotations: CodeMirror.lint.python || (() => []), async: true, delay: 600 },
        indentUnit: 4,
        extraKeys: {
            "Backspace": (cm) => {
                if (cm.somethingSelected()) return CodeMirror.Pass;
                const cursor = cm.getCursor();
                const lineContent = cm.getLine(cursor.line);

                if (cursor.ch > 0) {
                    const textBeforeCursor = lineContent.substring(0, cursor.ch);
                    if (/^\s+$/.test(textBeforeCursor)) {
                        const indentUnit = cm.getOption("indentUnit") || 4;
                        const spacesToRemove = cursor.ch % indentUnit === 0 ? indentUnit : (cursor.ch % indentUnit);
                        cm.replaceRange("", { line: cursor.line, ch: cursor.ch - spacesToRemove }, cursor);
                        return;
                    }
                }
                return CodeMirror.Pass;
            },
            "Tab": (cm) => cm.replaceSelection("    ", "end"),
            "Ctrl-Enter": () => runcode(),
            "Ctrl-S": (cm) => { if (window.ideStateData) window.ideStateData.saveCurrentFile(); return false; },
            "Ctrl-Space": "autocomplete",
            "Esc": (cm) => cm.closeHint?.()
        }
    });

    // Auto-trigger hint dropdown when user types a dot
    globalThis.myCodeMirror.on("inputRead", function (cm, change) {
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
    setInterval(() => {
        if (window.ideStateData) window.ideStateData.saveCurrentFile();
    }, 30000);
}

window.addEventListener('beforeunload', () => {
    if (window.ideStateData) window.ideStateData.saveCurrentFile();
});
