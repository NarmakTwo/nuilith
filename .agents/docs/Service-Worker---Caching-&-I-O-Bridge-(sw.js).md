# Service Worker — Caching & I/O Bridge (sw.js)
Relevant source files
- [README.md](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1)
- [coi-serviceworker.min.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/coi-serviceworker.min.js)
- [render.yaml](https://github.com/NarmakTwo/python-ide/blob/9fa46400/render.yaml)
- [sw.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js)

The Service Worker in Nuilith serves a dual purpose: it provides the infrastructure for offline capability through aggressive asset caching and acts as a synchronous bridge to resolve Python `input()` calls. Because WebAssembly execution in a Worker cannot natively block for asynchronous UI events, the Service Worker intercepts network requests to simulate a blocking I/O socket.

## Offline Asset Caching Strategy

Nuilith implements a **Stale-While-Revalidate** caching strategy [sw.js163-176](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L163-L176) This ensures that the application loads instantly from the cache while simultaneously fetching updates in the background for the next session.

### Asset Categorization

Assets are split into two primary arrays to optimize the installation phase:

1. **Local Assets (`LOCAL_ASSETS`)**: Core application files residing on the same origin, including the main logic (`index.js`), the worker runtime (`worker.js`), and manifest files [sw.js9-19](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L9-L19)
2. **CDN Assets (`CDN_ASSETS`)**: External dependencies including Alpine.js, CodeMirror (and its numerous addons/themes), jQuery Terminal, and the Pyodide loader [sw.js22-90](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L22-L90)

### Lifecycle Management

- **Install Event**: The worker caches all `LOCAL_ASSETS` using `cache.addAll()`. For `CDN_ASSETS`, it uses `Promise.allSettled` to fetch and cache each item individually; this prevents a single failed external request from breaking the entire installation [sw.js94-121](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L94-L121)
- **Activate Event**: Older versions of the cache (identified by `CACHE_NAME`) are purged to ensure users are always running the latest compatible version of the IDE [sw.js123-131](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L123-L131)

**Sources:**

- [sw.js6-92](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L6-L92) (Asset definitions)
- [sw.js94-121](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L94-L121) (Install logic)
- [sw.js163-176](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L163-L176) (Fetch strategy)

---

## The Synchronous Input Bridge

The most critical technical role of `sw.js` is managing the `/get_input` trap. This mechanism allows the `worker.js` (Python runtime) to perform a synchronous `XMLHttpRequest` that halts its execution until the user provides input in the UI.

### The Input Resolution Lifecycle

The following diagram illustrates how the Service Worker mediates between the blocked Worker thread and the asynchronous Main Thread.

**Diagram: Synchronous I/O Message Flow**

```
"index.js (Main Thread)"
"sw.js (Service Worker)"
"worker.js (Pyodide)"
"index.js (Main Thread)"
"sw.js (Service Worker)"
"worker.js (Pyodide)"
Python calls input()
W is now BLOCKED (sync)
Create MessageChannel()
Wait for User Enter key
XHR resolves, Python resumes
Synchronous XHR GET "/get_input"
Intercept request in fetch event
postMessage({type: "INPUT_REQUEST"}) + port2
terminal.read()
port2.postMessage(userInput)
channel.port1.onmessage triggered
HTTP 200 Response (userInput text)
```

### Implementation Details

- **The Trap**: The `fetch` listener checks if the request URL includes `/get_input`[sw.js137](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L137-L137)
- **MessageChannel**: A `MessageChannel` is instantiated for every input request. `port1` is kept in the Service Worker to receive the eventual response, while `port2` is transferred to the Main Thread [sw.js140-142](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L140-L142)
- **Client Selection**: The Service Worker identifies the active window client using `self.clients.matchAll()` to ensure the `INPUT_REQUEST` is sent to the UI and not back to the worker [sw.js149-153](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L149-L153)

**Sources:**

- [sw.js133-161](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L133-L161) (Fetch interceptor and MessageChannel logic)
- [README.md50-65](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L50-L65) (Architectural explanation of input model)

---

## Cross-Origin Isolation (COI) Requirements

For the synchronous I/O bridge and advanced synchronization primitives (like `SharedArrayBuffer`) to function, the browser must operate in a **Cross-Origin Isolated** state [README.md63-65](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L63-L65)

### Header Injection

Nuilith uses `coi-serviceworker.min.js` to ensure the necessary security headers are present, even on static hosts that do not allow custom header configuration. This script acts as a wrapper that reloads the page with the following headers:

- `Cross-Origin-Opener-Policy: same-origin`[coi-serviceworker.min.js2](https://github.com/NarmakTwo/python-ide/blob/9fa46400/coi-serviceworker.min.js#L2-L2)
- `Cross-Origin-Embedder-Policy: require-corp`[coi-serviceworker.min.js2](https://github.com/NarmakTwo/python-ide/blob/9fa46400/coi-serviceworker.min.js#L2-L2)

### COI Verification in Code

The IDE's ability to run synchronous code depends on these headers. The `coi-serviceworker` script detects if `window.crossOriginIsolated` is false and automatically registers itself to inject the headers on the next fetch [coi-serviceworker.min.js2](https://github.com/NarmakTwo/python-ide/blob/9fa46400/coi-serviceworker.min.js#L2-L2)

**Sources:**

- [coi-serviceworker.min.js1-2](https://github.com/NarmakTwo/python-ide/blob/9fa46400/coi-serviceworker.min.js#L1-L2) (COI implementation)
- [README.md63-65](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1#L63-L65) (Security header requirements)
- [sw.js17](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L17-L17) (Inclusion of COI script in cache)

---

## Data Flow: Code Entity Mapping

The following diagram maps the logical components of the Service Worker to their specific implementation entities in the codebase.

**Diagram: Service Worker Entity Mapping**

```
External Interactions

sw.js Entities

Intercepts

Identifies

postMessage

Enables

Populates

Populates

CACHE_NAME (v10)

LOCAL_ASSETS (Array)

CDN_ASSETS (Array)

fetch event listener

/get_input trap logic

worker.js: XMLHttpRequest (sync)

index.js: terminal.read()

coi-serviceworker.min.js
```

**Sources:**

- [sw.js6-19](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L6-L19) (Cache and local assets)
- [sw.js22-90](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L22-L90) (CDN assets)
- [sw.js133-161](https://github.com/NarmakTwo/python-ide/blob/9fa46400/sw.js#L133-L161) (Fetch and trap logic)
- [coi-serviceworker.min.js2](https://github.com/NarmakTwo/python-ide/blob/9fa46400/coi-serviceworker.min.js#L2-L2) (COI enablement)
