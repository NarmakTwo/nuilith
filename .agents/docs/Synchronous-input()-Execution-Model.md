# Synchronous input() Execution Model
Relevant source files
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [index.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)
- [sw.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js)
- [worker.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js)

The Synchronous `input()` Execution Model is a specialized architectural pattern in Nuilith that allows standard, blocking Python `input()` calls to function within the asynchronous environment of a web browser. Because WebAssembly (Wasm) execution in a Web Worker cannot natively block the browser's Main Thread to wait for user input, Nuilith implements a synchronous bridge using Service Worker interception and `XMLHttpRequest` (XHR).

## Architectural Overview

The model relies on a coordinated loop between three distinct execution contexts: the **Web Worker** (Python runtime), the **Service Worker** (Network interceptor), and the **Main Thread** (UI/Terminal).

When a Python script calls `input()`, the Web Worker is suspended via a synchronous XHR request to a virtual endpoint. The Service Worker traps this request, notifies the Main Thread to prompt the user, and holds the connection open until the user submits their response.

### System Interaction Diagram

This diagram maps the high-level logic to the specific code entities that facilitate the loop.

```
"index.js (Main Thread)"
"sw.js (Service Worker)"
"worker.js (Web Worker)"
"index.js (Main Thread)"
"sw.js (Service Worker)"
"worker.js (Web Worker)"
Pyodide executes input()
Worker Thread Suspended
[index.js:2310-2315]
navigator.serviceWorker.onmessage
Awaiting User Typing...
Worker Thread Resumes
[worker.js:220-224]
_sync_input_bridge()
[worker.js:222]
xhr.open("GET", "/get_input", false)
[sw.js:137-140]
Fetch Intercept "/get_input"
[sw.js:153]
postMessage({type: "INPUT_REQUEST"})
[index.js:2314]
term.read()
[index.js:2314]
MessageChannel.port.postMessage(userInput)
[sw.js:143-146]
resolve(new Response(userInput))
Returns string to Pyodide
```

Sources: [worker.js219-232](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L219-L232)[sw.js136-161](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L136-L161)[index.js2310-2315](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L2310-L2315) (Note: line numbers in index.js refer to the service worker message listener in the full file).

## Core Components

### The Web Worker Bridge

The `worker.js` environment patches the global `builtins.input` function within the Pyodide runtime [worker.js219-232](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L219-L232) Instead of the default behavior, it redirects to a JavaScript function `_sync_input_bridge` which utilizes a synchronous `XMLHttpRequest`[worker.js220-224](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L220-L224) This specific type of XHR is deprecated on the main thread but remains valid in Web Workers, effectively pausing the worker's execution until the HTTP request completes.

### The Service Worker Interceptor

The `sw.js` file contains a fetch event listener that acts as a "trap" for requests directed at `/get_input`[sw.js137-140](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L137-L140) Rather than reaching out to a real server, the Service Worker creates a `MessageChannel` and sends a `port` to the Main Thread [sw.js140-153](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L140-L153) It returns a `Promise` that only resolves once the Main Thread sends the user's input back through that specific port [sw.js142-147](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L142-L147)

### The Main Thread Terminal

The `index.js` controller listens for the `INPUT_REQUEST` from the Service Worker. It leverages the `jQuery Terminal` instance to switch to a reading state [index.js2310-2315](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L2310-L2315) Once the user presses Enter, the string is captured and dispatched back to the Service Worker, completing the cycle.

## Sub-Topics

### [XHR Intercept Lifecycle](/NarmakTwo/nuilith/3.1-xhr-intercept-lifecycle)

A granular, stage-by-stage breakdown of the data flow. This covers the transition from Python's internal `stdin` read to the browser's `MessageChannel` protocol and the final synthesis of the HTTP 200 response that unblocks the worker.
For details, see [XHR Intercept Lifecycle](/NarmakTwo/nuilith/3.1-xhr-intercept-lifecycle).

### [Cross-Origin Isolation & Security Headers](/NarmakTwo/nuilith/3.2-cross-origin-isolation-and-security-headers)

The synchronous input model and advanced Wasm features (like `SharedArrayBuffer`) require a secure environment known as Cross-Origin Isolation (COI). This section explains the necessity of `Cross-Origin-Opener-Policy` (COOP) and `Cross-Origin-Embedder-Policy` (COEP) headers, and how the `coi-serviceworker.min.js` shim ensures these are present across different hosting providers.
For details, see [Cross-Origin Isolation & Security Headers](/NarmakTwo/nuilith/3.2-cross-origin-isolation-and-security-headers).

## Implementation Summary
ContextFilePrimary Responsibility**Python Runtime**`worker.js`Patch `builtins.input` to trigger synchronous XHR [worker.js219-232](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L219-L232)**Network Layer**`sw.js`Intercept `/get_input` and bridge to Main Thread via `MessageChannel`[sw.js137-161](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L137-L161)**UI Controller**`index.js`Capture user input via `term.read()` and return it to the Service Worker [index.js2310-2315](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L2310-L2315)
Sources: [README.md54-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L61)[worker.js205-235](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L205-L235)[sw.js136-161](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L136-L161)
