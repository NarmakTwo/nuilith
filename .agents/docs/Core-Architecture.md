# Core Architecture
Relevant source files
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [index.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)
- [sw.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js)
- [worker.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js)

Nuilith's architecture is designed to overcome the single-threaded nature of the browser to provide a responsive, offline-capable Python development environment. The system is decoupled into three primary execution domains: the **Main Thread**, the **Web Worker**, and the **Service Worker**.

## High-Level Execution Model

The IDE operates by isolating the heavy WebAssembly (WASM) Python runtime from the user interface. This ensures that long-running scripts or intensive computations do not freeze the editor or terminal.

### Three-Layer Topology

The following diagram illustrates the relationship between the three layers and the primary code entities governing them.

**System Component Interaction**

```
Service Worker (Network/IO Layer)

Web Worker (Logic Layer)

Main Thread (UI Layer)

postMessage({type: 'RUN'})

postMessage({type: 'PRINT'})

Synchronous XHR /get_input

MessageChannel

User Input

HTTP 200 Response

Cache Assets

index.js

ideState (Alpine.js)

myCodeMirror

term (jQuery Terminal)

worker.js

Pyodide (WASM)

micropip

sw.js

Cache Storage
```

Sources: [README.md42-49](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L42-L49)[index.js5-10](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L5-L10)[worker.js19-20](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L19-L20)[sw.js136-161](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L136-L161)

---

## 1. Main Thread — UI Controller (`index.js`)

The Main Thread is the entry point of the application. It initializes the UI components and manages the application state using **Alpine.js**.

- **State Management**: The `ideState` object [index.js136-184](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L136-L184) tracks reactive properties such as `running`, `activeFile`, and `installedPackages`.
- **Editor**: Integration with **CodeMirror v5**[index.js7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L7-L7) provides the coding interface, including syntax highlighting and linting overlays.
- **Terminal**: Uses **jQuery Terminal**[index.js6](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L6-L6) to display `stdout`/`stderr` and capture user input.
- **Persistence**: Manages the `nuilithdb` IndexedDB [index.js14-17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L14-L17) to ensure projects and files are saved across sessions.

For a deep dive into UI state and editor configuration, see **[Main Thread — UI Controller (index.js)](/NarmakTwo/nuilith/2.1-main-thread-ui-controller-(index.js))**.

Sources: [index.js1-120](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1-L120)[README.md46](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L46-L46)

---

## 2. Web Worker — Python Runtime (`worker.js`)

The Web Worker hosts the **Pyodide** environment [worker.js4-6](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L4-L6) By running in a background thread, it can execute blocking Python code without impacting the frame rate of the UI.

- **Initialization**: Loads the Pyodide WASM module and the `micropip` package manager [worker.js13-17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L13-L17)
- **Message Protocol**: Listens for commands like `RUN`, `LINT`, and `INSTALL`[worker.js19-20](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L19-L20)
- **I/O Redirection**: Patches Python's `sys.stdout` and `sys.stderr` to forward output back to the Main Thread via `postToUI`[worker.js9-11](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L9-L11)
- **Background Linting**: Uses `pyflakes` to analyze code in the background [worker.js22-64](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L22-L64) returning `LINT_RESULT` annotations to the editor.

For details on the Python environment and message handling, see **[Web Worker — Python Runtime (worker.js)](/NarmakTwo/nuilith/2.2-web-worker-python-runtime-(worker.js))**.

Sources: [worker.js1-200](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L1-L200)[README.md47](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L47-L47)

---

## 3. Service Worker — Caching & I/O Bridge (`sw.js`)

The Service Worker acts as a programmable proxy between the browser and the network. It serves two critical roles:

- **Offline Support**: Caches local assets (like `index.js`, `worker.js`) and external CDN dependencies (CodeMirror, Alpine.js) [sw.js9-92](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L9-L92) to allow the IDE to function without an internet connection.
- **Synchronous I/O Bridge**: Resolves the "Blocking Input Problem." Since WebAssembly cannot natively pause to wait for UI input, `sw.js` intercepts a synchronous XMLHttpRequest to a virtual `/get_input` endpoint [sw.js137-161](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L137-L161) and coordinates with the Main Thread to retrieve user data.

For details on the caching strategy and the input bridge implementation, see **[Service Worker — Caching & I/O Bridge (sw.js)](/NarmakTwo/nuilith/2.3-service-worker-caching-and-io-bridge-(sw.js))**.

Sources: [sw.js1-161](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L1-L161)[README.md48-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L48-L61)

---

## Data Flow: Code Execution Lifecycle

The following diagram maps the flow of a single "Run" command from the UI through the execution layers.

**Execution Entity Map**

```
"sw.js (Fetch Handler)"
"worker.js (Pyodide)"
"index.js (ideState)"
"sw.js (Fetch Handler)"
"worker.js (Pyodide)"
"index.js (ideState)"
pyodide.runPythonAsync(code)
Python calls input()
postMessage({type: 'RUN', code: '...'})
postMessage({type: 'PRINT', text: 'Hello'})
Sync XHR GET /get_input
postMessage({type: 'INPUT_REQUEST'})
MessageChannel.port.postMessage(userInput)
HTTP 200 (Body: userInput)
postMessage({type: 'FINISHED'})
```

Sources: [index.js53-120](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L53-L120)[worker.js202-210](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L202-L210)[sw.js137-159](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L137-L159)[README.md54-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L61)
