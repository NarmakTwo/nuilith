# Main Thread — UI Controller (index.js)
Relevant source files
- [index.html](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html)
- [index.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js)

The main thread of Nuilith serves as the central orchestrator for the IDE, managing the user interface state via Alpine.js, coordinating the CodeMirror editor instance, and handling asynchronous communication with the Python Web Worker. It is responsible for data persistence using IndexedDB and providing a terminal interface via jQuery Terminal.

## Alpine.js State Management (`ideState`)

The UI logic is encapsulated within a reactive Alpine.js component named `ideState`. This object tracks the application's configuration, project metadata, and runtime status.

### Key Reactive Properties

- **Runtime State**: `running` (boolean) and `inRepl` (boolean) toggle the UI between execution and idle modes [index.js138-165](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L138-L165)
- **Feature Toggles**: User preferences such as `zenMode`, `featureTabs`, and `featurePackages` are persisted in `localStorage` and drive conditional rendering in the DOM [index.js149-154](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L149-L154)
- **Project & File System**: `currentProject`, `files`, and `activeFile` manage the virtual workspace [index.js168-182](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L168-L182)

### UI-Code Entity Mapping

The following diagram illustrates how Alpine.js properties map to specific UI components and logic handlers.

**Diagram: UI State to Code Mapping**

```
Code Entities

Alpine.js (ideState)

Toggles

Syncs

Triggers

Calls

[index.html:150-160]

[index.js:464-475]

[index.js:655-675]

[index.js:401-415]

ideState.running

Run/Stop Buttons

ideState.activeFile

CodeMirror Instance

ideState.currentProject

switchProject()

ideState.theme

setTheme()

UI Buttons

globalThis.myCodeMirror

IDB Logic

CSS Variables
```

Sources: [index.js136-210](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L136-L210)[index.html150-160](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html#L150-L160)

## Editor & Terminal Integration

Nuilith integrates **CodeMirror 5** for text editing and **jQuery Terminal** for I/O.

### CodeMirror Configuration

The editor is initialized with Python-specific modes and various addons for a professional development experience:

- **Linting**: A custom linting helper `pythonLint` is registered, which sends code to the worker and awaits `LINT_RESULT`[index.js123-132](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L123-L132)
- **Keymaps**: Supports `vim` and `emacs` bindings based on `ideState.keybindings`[index.js160](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L160-L160)
- **Addons**: Includes `closebrackets`, `foldgutter`, `matchbrackets`, and `active-line`[index.html79-86](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html#L79-L86)

### jQuery Terminal

The terminal (accessible via `globalThis.term`) acts as the standard output (stdout) and standard error (stderr) for the Python runtime.

- **Prompt**: Custom prompt defined as `[[b;green;]>>> ]`[index.js9](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L9-L9)
- **REPL Mode**: When `inRepl` is true, terminal input is sent directly to the worker for evaluation via `EVAL_REPL` messages [index.js284-290](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L284-L290)

Sources: [index.js6-12](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L6-L12)[index.js123-132](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L123-L132)[index.js450-500](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L450-L500)[index.html53-95](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html#L53-L95)

## Worker Messaging Protocol

The main thread communicates with `worker.js` using a standardized JSON message protocol.
Message TypeDirectionPurpose`READY`Worker -> MainSignals Pyodide is loaded and ready [index.js58](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L58-L58)`RUN`Main -> WorkerStarts execution of the current file [index.js255](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L255-L255)`LINT`Main -> WorkerRequests asynchronous linting via Pyflakes [index.js129](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L129-L129)`INSTALL`Main -> WorkerInstalls packages via `micropip`[index.js64](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L64-L64)`PRINT` / `ERROR`Worker -> MainStreams output text to the jQuery Terminal [index.js72-84](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L72-L84)`FINISHED`Worker -> MainSignals execution completion; resets UI state [index.js91-94](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L91-L94)
**Diagram: Messaging Data Flow**

```
"Web Worker (worker.js)"
"Main Thread (index.js)"
"Web Worker (worker.js)"
"Main Thread (index.js)"
User clicks 'Run'
loop
[Execution]
{ type: "RUN", code: "...", filename: "main.py" }
{ type: "PRINT", text: "Hello World" }
term.echo("Hello World")
{ type: "FINISHED" }
ideState.running = false
```

Sources: [index.js53-120](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L53-L120)[index.js250-270](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L250-L270)

## Persistence & Auto-Save

Nuilith uses **IndexedDB** (via the `nuilithdb` database) for project storage and **localStorage** for lightweight settings.

### IndexedDB Schema (`nuilithdb`)

- **Version**: 3 [index.js15](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L15-L15)
- **Store**: `projects` (Object Store) [index.js16](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L16-L16)
- **Data Structure**: Projects are stored as objects containing a `name`, `lastModified` timestamp, and a `files` array (objects with `name` and `content`) [index.js560-580](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L560-L580)

### Auto-Save Mechanism

The IDE performs a non-blocking auto-save every 30 seconds.

1. The `init()` function sets an interval [index.js345](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L345-L345)
2. `saveCurrentProject()` is called, which gathers the current `ideState.files` and updates the `activeFile` content from `myCodeMirror.getValue()`[index.js588-600](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L588-L600)
3. The project object is written to the `projects` store in IndexedDB [index.js605-615](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L605-L615)

Sources: [index.js13-17](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L13-L17)[index.js550-620](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L550-L620)[index.js655-680](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L655-L680)

## Project Switching & Initialization

When the application loads or a user switches projects:

1. **DB Open**: `openDB()` initializes the connection [index.js552](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L552-L552)
2. **Project Load**: `loadProject(name)` retrieves the project from IndexedDB [index.js624](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L624-L624)
3. **UI Sync**: `ideState.files` is populated, and the `activeFile` content is loaded into CodeMirror [index.js630-645](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L630-L645)
4. **Package Restore**: Saved packages for the project are retrieved from `localStorage` and sent to the worker for silent re-installation [index.js59-66](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L59-L66)

Sources: [index.js552-580](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L552-L580)[index.js624-650](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L624-L650)[index.js58-67](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L58-L67)
