# Features & User Guide
Relevant source files
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [index.html](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html)
- [index.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)

Nuilith is a browser-based Python Integrated Development Environment (IDE) designed for high-performance, offline-capable code execution. By leveraging **Pyodide** (CPython compiled to WebAssembly), it provides a complete development experience—including multi-file support, package management, and live linting—without requiring a backend server.

### Multi-File Projects & Workspace Management

Nuilith uses a virtual workspace system that allows users to manage multiple Python scripts within a single project context. The state is persisted using **IndexedDB** via the `nuilithdb` database [index.js14-16](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L14-L16)

- **Project Switching**: Users can create, rename, and switch between isolated projects. Each project maintains its own set of files and installed packages [index.js168-170](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L168-L170)
- **File Management**: The IDE supports adding, deleting, and renaming `.py` files within the active project [index.js180-184](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L180-L184)
- **Auto-Save**: To prevent data loss, the `ideState` triggers an auto-save protocol that commits the current editor buffer to IndexedDB every 30 seconds or immediately upon code execution [index.js8](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L8-L8)

**Sources:**[index.js8-16](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L8-L16)[index.js168-184](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L168-L184)[README.md71-75](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L71-L75)

---

### Live Linting & Code Analysis

Nuilith integrates **Pyflakes** to provide real-time feedback on code quality. This process is decoupled from the main UI thread to ensure a lag-free typing experience.

#### The Linting Pipeline

1. **Trigger**: CodeMirror's linting addon calls the `pythonLint` helper [index.js123-132](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L123-L132)
2. **Request**: The Main Thread sends a `LINT` message to `worker.js` containing the code and a unique `lintRequestId`[index.js129](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L129-L129)
3. **Execution**: The Web Worker executes Pyflakes against the code.
4. **Callback**: The results are returned as `LINT_RESULT`, and the `pendingLintCallback` maps the annotations back to the specific line numbers in the editor [index.js68-71](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L68-L71)

**Sources:**[index.js68-71](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L68-L71)[index.js123-132](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L123-L132)[README.md83](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L83-L83)

---

### Package Manager (micropip)

The IDE supports installing pure-Python packages directly from PyPI using the `micropip` library.

- **Installation**: Users input a package name in the UI, which triggers `installPackage()`. This sends an `INSTALL` message to the worker [index.js96-112](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L96-L112)
- **Persistence**: Successfully installed packages are stored in `localStorage`[index.js101](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L101-L101) Upon IDE restart or worker re-initialization, the system performs a "silent" re-installation to restore the environment [index.js58-67](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L58-L67)
- **Limitations**: Only pure-Python packages are supported; packages requiring native C-extensions (not already included in Pyodide) cannot be installed [README.md81](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L81-L81)

**Sources:**[index.js58-67](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L58-L67)[index.js96-112](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L96-L112)[README.md81](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L81-L81)

---

### REPL Mode & Terminal

The output pane is powered by **jQuery Terminal**, providing a dual-purpose interface for program output and interactive exploration.

- **Execution**: When a script is run, the worker pipes `stdout` and `stderr` to the terminal via `PRINT` and `ERROR` message types [index.js72-89](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L72-L89)
- **Interactive REPL**: When not running a script, the terminal functions as a Python REPL. It uses a custom prompt `>>>`[index.js9](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L9-L9) and evaluates inputs through the worker's Python environment.
- **ANSI Support**: The terminal handles ANSI escape sequences, such as `\x1b<FileRef file-url="https://github.com/NarmakTwo/nuilith/blob/9fa46400/2J` for clearing the screen [index.js#L73-L76" min=73 max=76 file-path="2J` for clearing the screen [index.js">Hii

**Sources:**[index.js9-10](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L9-L10)[index.js72-94](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L72-L94)

---

### Customization & Zen Mode

Nuilith offers extensive UI customization through the `ideState` Alpine.js object [index.js136](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L136-L136)
FeatureDescriptionImplementation**Themes**15+ themes (e.g., Monokai, Dracula, Nord)`setTheme()` updates CSS variables [index.js157](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L157-L157)**Zen Mode**Hides all UI chrome, leaving only the editorToggles `zenMode` boolean in `ideState`[index.js154](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L154-L154)**Keybindings**Support for Default, Vim, and EmacsLoads specific CodeMirror keymaps [index.js93-94](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L93-L94)**Editor Toggles**Line numbers, code folding, bracket matchingReactive properties in Alpine.js [index.js159-164](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L159-L164)
**Sources:**[index.js136-165](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L136-L165)[index.html56-68](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L56-L68)[index.html93-94](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L93-L94)

---

### The .nu Export Format

To facilitate project portability, Nuilith uses a custom `.nu` bundle format.

- **Structure**: A `.nu` file is a **JSZip** archive [index.html101](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L101-L101)
- **Contents**:

1. `manifest.json`: Contains project metadata and the list of required PyPI packages.
2. Source Files: All `.py` files associated with the project.
- **Import Logic**: When a `.nu` file is uploaded, the IDE extracts the contents, populates the IndexedDB store, and triggers the package manager to install the dependencies listed in the manifest [README.md75](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L75-L75)

**Sources:**[index.html101](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L101-L101)[README.md75](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L75-L75)

---

### System Data Flow

The following diagram illustrates how user actions in the UI (Natural Language Space) map to internal Code Entities (Code Space).

**User Interaction to Code Execution Flow**

```
Execution Worker (worker.js)

Main Controller (index.js)

User Interface (index.html)

Click 'Run' Button

ideState.runCode()

Type in Editor

CodeMirror.on('change')

pythonWorker.postMessage({type: 'RUN'})

pythonLint(text, callback)

pythonWorker.postMessage({type: 'LINT'})

pyodide.runPythonAsync()

pyflakes.api.check()

postMessage({type: 'PRINT'})

term.echo()
```

**Sources:**[index.js53-120](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L53-L120)[index.js123-132](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L123-L132)[README.md44-49](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L44-L49)

---

### Keyboard Shortcuts

The IDE maps several standard shortcuts to editor and system functions:
ShortcutAction`Ctrl + Enter`Run the current file`Ctrl + S`Manual Save (triggers IDB commit)`Ctrl + F`Search within the editor`Alt + G`Jump to line`Ctrl + /`Toggle comment on selected lines
**Sources:**[index.html73-76](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L73-L76)[index.js160](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L160-L160) (Keymaps logic)

---

### Architectural Entity Mapping

This diagram maps high-level IDE features to their specific implementation classes and files.

**Feature to Entity Mapping**

```

```

**Sources:**[index.js1-18](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1-L18)[index.js135-185](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L135-L185)[README.md42-49](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L42-L49)
