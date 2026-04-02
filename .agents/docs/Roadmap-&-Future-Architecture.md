# Roadmap & Future Architecture
Relevant source files
- [CONTRIBUTING.md](https://github.com/NarmakTwo/python-ide/blob/9fa46400/CONTRIBUTING.md?plain=1)
- [README.md](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1)
- [render.yaml](https://github.com/NarmakTwo/python-ide/blob/9fa46400/render.yaml)

This page outlines the strategic technical evolution of Nuilith. The current architecture relies on a decoupled three-layer model—Main Thread (`index.js`), Web Worker (`worker.js`), and Service Worker (`sw.js`) [README.md42-49](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L42-L49) To transition from a browser-based editor to a comprehensive IDE, several structural migrations and feature integrations are planned.

## Core Editor Migration: Monaco Editor

The current implementation uses **CodeMirror v5** to handle text editing, linting annotations, and keybindings [README.md46](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L46-L46) While lightweight, it lacks the advanced Language Server Protocol (LSP) support and performance of modern IDEs.

### Implementation Strategy

The migration involves replacing the `CodeMirror` instance initialized in the UI layer with a `Monaco Editor` instance. This will require:

1. **State Synchronization**: Updating the `ideState` Alpine.js object to interface with Monaco's model-based system instead of CodeMirror's `doc` objects.
2. **Linting Pipeline**: Refactoring the `LINT` message flow in `worker.js` to return diagnostics compatible with `monaco.editor.setModelMarkers()`.
3. **Theme Integration**: Translating the current `programiz` CSS-based theme into a Monaco JSON theme definition.

**Sources:**[README.md42-49](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L42-L49)[CONTRIBUTING.md66](https://github.com/NarmakTwo/python-ide/blob/9fa46400/CONTRIBUTING.md?plain=1#L66-L66)

---

## Interactive Data Science: Jupyter & Matplotlib

A primary goal is to support interactive data science workflows by integrating notebook interfaces and graphical output.

### Jupyter Notebook Interface

Instead of a single text buffer, the UI will support a "Cell" based model.

- **Data Flow**: Each cell will be treated as an independent execution block sent to `worker.js`.
- **Persistence**: The `.nu` format (JSZip) will be updated to include a `.ipynb` compatible JSON structure within the `manifest.json` or as separate files [README.md75](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L75-L75)

### Matplotlib Integration

Currently, `stdout` and `stderr` are piped to `jQuery Terminal`[README.md47](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L47-L47) Matplotlib requires a virtual canvas.

- **Implementation**: Pyodide's `canvas` backend will be used. The `worker.js` will intercept plot commands and send a `BITMAP` or `BASE64` message to the Main Thread.
- **UI Component**: A new reactive pane in the `ideState` will be dedicated to rendering these graphical outputs.

### Architecture Transition: Static to Interactive

The following diagram illustrates the transition from the current terminal-only output to a multi-modal output system.

**Multi-Modal Output Architecture**

```
Main Thread (index.js)

Web Worker (worker.js)

Message: 'STDOUT'

Message: 'PLOT_RENDER'

Pyodide Runtime

Matplotlib Canvas Interceptor

stdout / stderr

jQuery Terminal Instance

New Canvas/Image UI Component

Alpine.js ideState
```

**Sources:**[README.md42-49](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L42-L49)[README.md102-103](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L102-L103)[CONTRIBUTING.md60-61](https://github.com/NarmakTwo/python-ide/blob/9fa46400/CONTRIBUTING.md?plain=1#L60-L61)

---

## Multi-Language WASM Runtimes

Nuilith is designed to expand beyond CPython (via Pyodide). The roadmap includes integrating runtimes for Node.js, Ruby, Lua, and C/C++ using WebAssembly.

### Modular Worker System

To support multiple languages, the `worker.js` will move toward a "Driver" pattern:

- **Runtime Drivers**: Specific handlers for different WASM binaries (e.g., `python_driver.js`, `ruby_driver.js`).
- **Unified I/O**: The synchronous `input()` intercept logic using `/get_input` and `sw.js` will be abstracted to serve any language requiring blocking I/O [README.md54-61](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L54-L61)

**Sources:**[README.md105](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L105-L105)[CONTRIBUTING.md63](https://github.com/NarmakTwo/python-ide/blob/9fa46400/CONTRIBUTING.md?plain=1#L63-L63)

---

## UI Modernization: Modular Sidebar & Persistence

The current UI is a dual-pane flexbox layout [README.md46](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L46-L46) Future iterations will introduce a more extensible workspace.

### Enhanced Sidebar

A new sidebar component will manage:

1. **File Explorer**: Direct manipulation of the virtual filesystem stored in `IndexedDB`[README.md71](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L71-L71)
2. **Extension Marketplace**: A system to toggle features like the `micropip` manager or theme settings [README.md73](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L73-L73)

### Backend & Cloud Persistence

While Nuilith is currently "static-first" and relies on `IndexedDB` for auto-save [README.md74](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L74-L74) a backend layer is planned for:

- **Cloud Sync**: Synchronizing the `projects` object store with a remote database.
- **Collaboration**: Real-time shared editing sessions.

### System Entity Mapping: UI to Code

This diagram maps the planned "Natural Language" features to the specific code entities they will interact with or replace.

**Roadmap Entity Mapping**

```
Code Entity Space

Natural Language Concepts

Multi-Language Support

Enhanced File Management

Cloud Persistence

worker.js (WASM Runtime Host)

index.js (ideState / Alpine.js)

IndexedDB (nuilithdb / projects store)

New: backend_proxy.js
```

**Sources:**[README.md71-74](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L71-L74)[README.md104-107](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L104-L107)[CONTRIBUTING.md62-65](https://github.com/NarmakTwo/python-ide/blob/9fa46400/CONTRIBUTING.md?plain=1#L62-L65)

---

## Planned Implementation Phases
PhaseFeatureImpacted FilesDescription**1****Modular UI**`index.html`, `assets/style.css`Transition to a grid-based layout with a collapsible sidebar.**2****Monaco Integration**`index.js`, `worker.js`Replace CodeMirror; implement LSP-lite for Python.**3****Visual Data**`worker.js`, `index.js`Matplotlib support and canvas rendering in the UI.**4****Multi-Runtime**`worker.js`, `sw.js`Support for non-Python WASM binaries using the existing I/O bridge.**5****Cloud Sync**`index.js`Optional authentication and remote storage for project buffers.
**Sources:**[README.md98-107](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L98-L107)[CONTRIBUTING.md58-67](https://github.com/NarmakTwo/python-ide/blob/9fa46400/CONTRIBUTING.md?plain=1#L58-L67)
