# Alpine.js State Management
Relevant source files
- [index.html](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html)
- [index.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js)

The Alpine.js state management layer serves as the reactive core of the Nuilith IDE. It encapsulates the UI state, user preferences, and file system metadata into a single global data object named `ideState`. This object bridges the gap between the DOM (handled by Alpine.js), the CodeMirror editor instance, and the Pyodide Web Worker.

## The ideState Data Object

The `ideState` object is initialized during the `alpine:init` event. It manages everything from visibility toggles for modals to the list of active files in the current project.

### Core Reactive Properties

The state is divided into several functional categories:
PropertyTypeDescription`running`BooleanIndicates if a Python script is currently executing in the worker. [index.js138](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L138-L138)`inRepl`BooleanTracks if the IDE is in REPL mode (interactive terminal). [index.js165](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L165-L165)`zenMode`BooleanToggles a distraction-free UI by hiding sidebars and headers. [index.js154](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L154-L154)`files`ArrayA list of file objects `{name: string, content: string}` in the current project. [index.js180](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L180-L180)`activeFile`StringThe name of the file currently loaded into CodeMirror. [index.js181](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L181-L181)`installedPackages`ArrayList of packages currently available in the Pyodide environment. [index.js141](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L141-L141)`settingsOpen`BooleanControls the visibility of the settings drawer/modal. [index.js137](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L137-L137)
### UI State Logic Flow

The following diagram illustrates how the `ideState` object mediates interactions between the user and the underlying IDE components.

**UI State Interaction Diagram**

```
External Components

DOM Elements

Alpine.js (ideState)

calls runCode()

triggers

sets activeFile

loads content into

auto-save

calls setTheme()

ideState Object

running: boolean

activeFile: string

files: Array

theme: string

Run Button (x-on:click)

File Tab (x-for)

Settings Modal (x-show)

CodeMirror (myCodeMirror)

Web Worker (pythonWorker)

IndexedDB (nuilithdb)
```

Sources: [index.js135-185](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L135-L185)[index.js52-120](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L52-L120)[index.html230-250](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html#L230-L250)

## Lifecycle Hooks and Initialization

When Alpine.js initializes, the `init()` function within `ideState` performs critical setup tasks:

1. **Project Loading**: It retrieves the list of projects and the current project name from `localStorage`. [index.js243-245](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L243-L245)
2. **Database Connection**: It opens the IndexedDB connection (`nuilithdb`) to fetch file contents. [index.js247-248](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L247-L248)
3. **Worker Bootstrapping**: It initializes the Web Worker and sets up the message listener. [index.js250](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L250-L250)
4. **Editor Sync**: It populates the CodeMirror instance with the content of the `activeFile`. [index.js253-255](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L253-L255)

### Persistence Strategy

User settings (e.g., `fontSize`, `theme`, `keybindings`) are persisted to `localStorage` immediately upon change via Alpine.js watchers or setter functions. [index.js157-164](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L157-L164) File contents, however, are managed through a more robust auto-save cycle targeting IndexedDB. [index.js335-345](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L335-L345)

## Key Functions and Methods

The `ideState` object defines several methods that handle complex UI-to-Logic transitions:

### Code Execution (`runCode`)

The `runCode()` method checks the current state; if `running` is false, it gathers the code from the `activeFile` and sends a `RUN` message to the `pythonWorker`. It also updates the `running` state to `true`, which reactively changes the "Run" button to a "Stop" button in the UI. [index.js464-484](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L464-L484)

### File Management

- **`switchFile(name)`**: Saves the current editor content to the `files` array, updates `activeFile`, and loads the new file's content into CodeMirror. [index.js285-300](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L285-L300)
- **`addFile()`**: Prompts for a filename, creates a new entry in the `files` array, and switches focus to it. [index.js302-315](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L302-L315)
- **`deleteFile(name)`**: Removes a file from the project state and IndexedDB, ensuring at least `main.py` remains. [index.js317-333](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L317-L333)

### Package Management

The `installPackage()` method transitions the UI into a loading state (`installingPackage = true`) and dispatches an `INSTALL` message to the worker. Success or failure is communicated back via worker messages, which update the `installedPackages` array. [index.js508-518](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L508-L518)

## State-to-Code Mapping

This diagram maps specific UI actions to the internal `ideState` methods and the resulting system calls.

**Action-to-Entity Mapping**

```
"nuilithdb (IndexedDB)"
"pythonWorker (Web Worker)"
"myCodeMirror"
"ideState (Alpine.js)"
User
"nuilithdb (IndexedDB)"
"pythonWorker (Web Worker)"
"myCodeMirror"
"ideState (Alpine.js)"
User
Click "Run"
getValue()
codeString
postMessage({type: 'RUN', code: codeString})
set running = true
Switch Tab (file.py)
getValue()
update file content
set activeFile = 'file.py'
setValue(newContent)
```

Sources: [index.js464-484](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L464-L484)[index.js285-300](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L285-L300)[index.js52-120](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L52-L120)

## Settings and Theme Management

The `ideState` maintains a `themes` array containing metadata for both CodeMirror themes and general UI colors (background, foreground, etc.). [index.js185-235](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L185-L235) When the `theme` property changes:

1. The `setTheme(themeId)` function is called.
2. It updates the `data-theme` attribute on the `<html>` element for DaisyUI/Tailwind. [index.js410](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L410-L410)
3. It updates the CodeMirror `theme` option. [index.js413](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L413-L413)
4. It persists the choice to `localStorage`. [index.js411](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L411-L411)

Sources: [index.js135-240](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L135-L240)[index.js408-425](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L408-L425)[index.html2](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html#L2-L2)
