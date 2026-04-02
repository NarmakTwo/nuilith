# Glossary
Relevant source files
- [CONTRIBUTING.md](https://github.com/NarmakTwo/python-ide/blob/9fa46400/CONTRIBUTING.md?plain=1)
- [README.md](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1)
- [index.html](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html)
- [index.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js)
- [manifest.json](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json)
- [render.yaml](https://github.com/NarmakTwo/python-ide/blob/9fa46400/render.yaml)
- [style.css](https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css)
- [sw.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js)
- [worker.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js)

This page provides definitions for Nuilith-specific terminology, architectural patterns, and domain concepts. It serves as a technical reference for engineers to map conceptual descriptions to specific implementation details in the codebase.

## Core Architectural Concepts

### 1. Synchronous Input Bridge

The mechanism that allows the blocking Python `input()` function to operate within the asynchronous, single-threaded environment of a web browser. It utilizes a synchronous `XMLHttpRequest` (XHR) to a "trap" URL which is intercepted by a Service Worker.

- **Implementation**: The Web Worker performs a sync XHR to `/get_input`[worker.js206-213](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L206-L213) The Service Worker (`sw.js`) intercepts this [sw.js137-140](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L137-L140) creates a `MessageChannel`, and asks the Main Thread for input [sw.js153](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L153-L153)
- **Data Flow**:

1. `worker.js` (Sync XHR) $\rightarrow$
2. `sw.js` (Fetch Intercept) $\rightarrow$
3. `index.js` (`term.read()`) $\rightarrow$
4. `sw.js` (Response Synthesis) $\rightarrow$
5. `worker.js` (Resumes execution).

### 2. Cross-Origin Isolation (COI)

A security state required by modern browsers to enable high-resolution timers and `SharedArrayBuffer`, which are critical for thread synchronization in WebAssembly runtimes like Pyodide.

- **Implementation**: Managed by `coi-serviceworker.min.js`[index.html50](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html#L50-L50) This script ensures the necessary HTTP headers (`Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy`) are present [README.md63](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L63-L63)

### 3. Pyodide Runtime

The CPython interpreter compiled to WebAssembly (WASM). It runs inside a dedicated Web Worker to prevent the UI from freezing during heavy computation.

- **Implementation**: Initialized in `worker.js` using `loadPyodide()`[worker.js14](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L14-L14)

**Diagram: System Space to Code Entity Mapping**

```
Code Entity Space

Natural Language Concept

postMessage({type: 'PRINT'})

pythonWorker.postMessage({type: 'RUN'})

Sync XHR (/get_input)

client.postMessage({type: 'INPUT_REQUEST'})

Python Execution Engine

UI & State Controller

I/O Interceptor

worker.js

index.js (ideState)

sw.js
```

**Sources**: [README.md42-49](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L42-L49)[worker.js9-11](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L9-L11)[index.js53-57](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L53-L57)[sw.js137-161](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L137-L161)

---

## Codebase Terms & Abbreviations
TermDefinitionCode Pointer**`.nu` Format**A project bundle format consisting of a JSZip archive containing Python files and a `manifest.json`.[README.md75](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L75-L75)[index.js167-169](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L167-L169)**`ideState`**The reactive Alpine.js data object that manages the entire IDE UI state.[index.js136-184](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L136-L184)**`micropip`**The package manager used to install pure-Python packages from PyPI into the Pyodide environment.[worker.js15](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L15-L15)[worker.js100-103](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L100-L103)**`pyflakes`**The engine used for background linting of Python code.[worker.js30-35](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L30-L35)**`LintReporter`**A custom Python class inheriting from `pyflakes.reporter.Reporter` to format errors for CodeMirror.[worker.js39-59](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L39-L59)**`nuilithdb`**The IndexedDB database name used for persistent storage of projects and files.[index.js14-15](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L14-L15)**Zen Mode**A UI state that toggles off sidebars and toolbars for a distraction-free editing experience.[index.js154](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L154-L154)
**Sources**: [index.js13-18](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L13-L18)[worker.js39-64](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L39-L64)[README.md71-75](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L71-L75)

---

## Domain Concepts

### Live Linting Pipeline

Nuilith performs "Live Linting" by sending the current editor buffer to the Web Worker without interrupting the user.

1. **Trigger**: `index.js` registers a `pythonLint` helper with CodeMirror [index.js123-132](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L123-L132)
2. **Request**: A `LINT` message is posted to `worker.js` with a unique `lintRequestId`[index.js129](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L129-L129)
3. **Processing**: The worker runs `pyflakes` via `pyodide.runPythonAsync`[worker.js26-64](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L26-L64)
4. **Reporting**: Errors are captured by `LintReporter`, converted to JSON, and sent back as `LINT_RESULT`[worker.js65-75](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L65-L75)
5. **Rendering**: `index.js` receives the annotations and executes the `pendingLintCallback` to update the editor UI [index.js68-71](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L68-L71)

**Diagram: Linting Data Flow**

```
Pyodide (Python)
Web Worker (worker.js)
Main Thread (index.js)
CodeMirror (index.js)
Pyodide (Python)
Web Worker (worker.js)
Main Thread (index.js)
CodeMirror (index.js)
Trigger pythonLint(text)
postMessage({type: "LINT", code: text, id})
runPythonAsync(pyflakes.api.check)
Return r.errors (LintReporter)
postMessage({type: "LINT_RESULT", annotations})
pendingLintCallback(annotations)
```

**Sources**: [index.js123-132](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L123-L132)[worker.js22-82](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L22-L82)

### PWA & Service Worker Caching

Nuilith is a Progressive Web App (PWA) that functions offline.

- **`LOCAL_ASSETS`**: Files residing in the repository (e.g., `index.js`, `style.css`) [sw.js9-19](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L9-L19)
- **`CDN_ASSETS`**: External dependencies (e.g., CodeMirror, Alpine.js, Pyodide) fetched and cached during the `install` event [sw.js22-90](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L22-L90)
- **Stale-While-Revalidate**: The caching strategy used to serve content instantly from the cache while updating it in the background [sw.js164-175](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L164-L175)

**Sources**: [sw.js6-131](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L6-L131)[manifest.json1-35](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L1-L35)
