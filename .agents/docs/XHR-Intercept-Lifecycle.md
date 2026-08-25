# XHR Intercept Lifecycle
Relevant source files
- [index.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js)
- [sw.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js)
- [worker.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js)

The synchronous `input()` execution model in Nuilith enables blocking Python code to run within a Web Worker while still interacting with the asynchronous, single-threaded DOM of the browser. This is achieved through a multi-stage lifecycle involving the **Web Worker**, **Service Worker**, and **Main Thread**.

## Overview of the 6-Stage Cycle

Because the browser's `input()` equivalent is asynchronous, but Python's `input()` is synchronous (blocking), the worker must be halted until the user provides a response. Nuilith uses a synchronous `XMLHttpRequest` (XHR) to a dummy URL, which the Service Worker intercepts to bridge the communication to the Main Thread's terminal.

### The Intercept Pipeline

The following diagram illustrates the flow of data and control across the three execution contexts.

**Diagram: Synchronous Input Bridge Flow**

```
"index.js (Main Thread)"
"sw.js (Service Worker)"
"worker.js (Pyodide)"
"index.js (Main Thread)"
"sw.js (Service Worker)"
"worker.js (Pyodide)"
Python calls input("Name: ")
XHR Returns responseText
Python execution resumes
builtins.input = _sync_input_bridge
postToUI("PRINT", prompt)
req = new XMLHttpRequest()
req.open("GET", "/get_input", false)
req.send() (BLOCKS WORKER)
onfetch intercept "/get_input"
channel = new MessageChannel()
client.postMessage("INPUT_REQUEST", [port2])
term.read() (Wait for Enter)
port1.postMessage(userInput)
resolve(new Response(userInput))
return responseText
```

**Sources:**[worker.js202-235](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L202-L235)[sw.js133-161](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L133-L161)[index.js800-815](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L800-L815)

---

## 1. Worker Initialization & Patching

When a Python script is executed via the `RUN` message in `worker.js`, the environment is patched to redirect the standard `input()` function. The native Python `input` is replaced by a JavaScript wrapper `_sync_input_bridge`.

- **Function:**`_sync_input_bridge`
- **Location:**[worker.js215-230](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L215-L230)
- **Mechanism:** It uses a synchronous `XMLHttpRequest` (XHR). In Web Workers, setting the third parameter of `open()` to `false` makes the request synchronous, effectively freezing the worker thread until the request completes.

**Sources:**[worker.js215-230](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L215-L230)

## 2. Service Worker Interception

The Service Worker (`sw.js`) acts as a network proxy. It listens for fetch events and specifically traps requests directed at the virtual path `/get_input`.

- **Event Listener:**`self.addEventListener('fetch', ...)`[sw.js133](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L133-L133)
- **Trap Condition:**`url.pathname.includes('/get_input')`[sw.js137](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L137-L137)
- **Bridge Logic:** Instead of fetching from the network, it creates a `MessageChannel` to facilitate two-way communication with the Main Thread (the window client).

**Sources:**[sw.js137-143](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L137-L143)

## 3. MessageChannel & Main Thread Notification

The Service Worker cannot directly access the UI or the terminal. It uses the `postMessage` API to notify the Main Thread that an input is required.

- **Entity:**`MessageChannel`[sw.js140](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L140-L140)
- **Communication:** The Service Worker sends `port2` of the channel to the Main Thread via a message of type `INPUT_REQUEST`.
- **Client Matching:** The SW identifies the active window using `self.clients.matchAll()` to ensure the prompt appears in the correct UI instance.

**Sources:**[sw.js149-153](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L149-L153)

## 4. Terminal Prompt (Main Thread)

In `index.js`, the application listens for the `INPUT_REQUEST` from the Service Worker.

- **Listener:**`navigator.serviceWorker.addEventListener('message', ...)`[index.js800](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L800-L800)
- **Terminal Integration:** The UI calls `term.read()`, which is a `jquery.terminal` method that puts the terminal into a reading state, waiting for the user to type a string and press Enter.
- **Data Flow:** Once the user submits, the text is sent back through the transferred `MessagePort` (`port1`).

**Sources:**[index.js800-815](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L800-L815)

## 5. Response Synthesis

The Service Worker receives the user's string on `port1.onmessage`.

- **Resolution:** The promise inside the `fetch` event handler resolves with a new `Response` object containing the user's input as the body text.
- **Headers:** The response is returned with `Content-Type: text/plain`.

**Sources:**[sw.js142-147](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L142-L147)

## 6. Worker Resumption

Back in the Web Worker, the synchronous `XHR.send()` call finally unblocks.

- **Completion:** The `responseText` from the XHR contains the string provided by the user.
- **Return:**`_sync_input_bridge` returns this string to the Pyodide runtime.
- **Resume:** The Python interpreter receives the value as the result of the `input()` call and continues execution of the next line of code.

**Sources:**[worker.js228-229](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L228-L229)

---

## Technical Implementation Summary
ComponentRoleKey Code Entity**Web Worker**Halt execution and request data`XMLHttpRequest.open(..., false)`[worker.js226](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L226-L226)**Service Worker**Intercept request and bridge threads`MessageChannel`[sw.js140](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L140-L140)**Main Thread**Capture user input via UI`term.read()`[index.js809](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L809-L809)
**Diagram: Code Entity Mapping**

```
Main Thread Space (index.js)

Service Worker Space (sw.js)

Web Worker Space (worker.js)

Intercept /get_input

INPUT_REQUEST

User String

Response(userInput)

_sync_input_bridge

XMLHttpRequest

fetch event handler

MessageChannel

SW Message Listener

term.read()
```

**Sources:**[worker.js215-230](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L215-L230)[sw.js137-160](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L137-L160)[index.js800-815](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L800-L815)
