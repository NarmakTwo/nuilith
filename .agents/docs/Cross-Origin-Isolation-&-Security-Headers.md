# Cross-Origin Isolation & Security Headers
Relevant source files
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [coi-serviceworker.min.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/coi-serviceworker.min.js)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)
- [sw.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js)

This page explains the security architecture of Nuilith, specifically the requirement for **Cross-Origin Isolation (COI)**. COI is a browser security state that enables access to high-resolution timers and, most importantly, `SharedArrayBuffer`—a prerequisite for the synchronous execution model used by the Python runtime.

## The Necessity of COI

Nuilith executes Python code in a Web Worker using Pyodide [README.md47-48](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L47-L48) To support Python's native `input()` function, which is a blocking call, the system must suspend the worker thread while awaiting user input from the main thread [README.md54-56](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L56)

While the current implementation uses a synchronous `XMLHttpRequest` (XHR) intercept loop [README.md54-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L61) future-proofing and performance optimizations (such as `Atomics.wait` and `SharedArrayBuffer`) require the browser to be in a "Cross-Origin Isolated" state [README.md63-64](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L63-L64) Without this state, modern browsers disable these features to mitigate Spectre-style side-channel attacks.

### Key Requirements

- **SharedArrayBuffer**: Required for memory sharing between the Main Thread and Web Workers.
- **Synchronization Primitives**: Enables low-latency communication for the I/O bridge.

**Sources:**[README.md47-48](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L47-L48)[README.md54-64](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L64)

---

## Security Headers (COOP & COEP)

To achieve a Cross-Origin Isolated state, the web server must serve the top-level document with two specific HTTP response headers:
HeaderValuePurpose`Cross-Origin-Opener-Policy` (COOP)`same-origin`Isolates the window from other documents, preventing cross-origin interactions.`Cross-Origin-Embedder-Policy` (COEP)`require-corp`Ensures the document only loads resources that have explicitly opted-in to being loaded.
### The `coi-serviceworker` Shim

Because many static hosting providers (GitHub Pages, basic S3 buckets) do not allow custom header configuration, Nuilith includes `coi-serviceworker.min.js`[sw.js17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L17-L17) This script acts as a middleware that:

1. Registers itself as a Service Worker [coi-serviceworker.min.js2](https://github.com/NarmakTwo/nuilith/blob/9fa46400/coi-serviceworker.min.js#L2-L2)
2. Intercepts all fetch requests [coi-serviceworker.min.js2](https://github.com/NarmakTwo/nuilith/blob/9fa46400/coi-serviceworker.min.js#L2-L2)
3. Injects the COOP and COEP headers into the responses before they reach the browser's rendering engine [coi-serviceworker.min.js2](https://github.com/NarmakTwo/nuilith/blob/9fa46400/coi-serviceworker.min.js#L2-L2)

### Header Injection Logic

The shim's `fetch` event listener modifies headers as follows:

```
Network
coi-serviceworker
Browser
Network
coi-serviceworker
Browser
Inject COOP: same-origin
Inject COEP: require-corp
Page enters Cross-Origin Isolated state
Request index.html
Fetch index.html
Response (No COOP/COEP)
Response (With Headers)
```

**Sources:**[sw.js17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L17-L17)[coi-serviceworker.min.js2](https://github.com/NarmakTwo/nuilith/blob/9fa46400/coi-serviceworker.min.js#L2-L2)[README.md63-64](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L63-L64)

---

## Deployment Considerations

When deploying Nuilith to production environments, the security headers must be handled either by the hosting provider's configuration or by ensuring the shim is correctly loaded.

### Render Configuration

Nuilith includes a `render.yaml` file for deployment on Render. Since it is a static site, it defines the `staticPublishPath` as the root directory [render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7) Render's static hosting environment respects the `coi-serviceworker` shim, but for optimal performance, these headers should ideally be set at the CDN level.

### Provider Comparison
ProviderMethodConfiguration File**Render**Static Hosting`render.yaml`[render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)**Vercel**`vercel.json`Requires `headers` array with COOP/COEP.**Netlify**`_headers`Requires specific rules for `/*`.
### Secure Context Requirement

Service Workers and COI require a **Secure Context**. This means Nuilith will only function over:

- `https://`
- `http://localhost` or `http://127.0.0.1`[README.md96](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L96-L96)

Running the project via the `file://` protocol will cause the Service Worker registration to fail, breaking the `input()` bridge and offline capabilities [README.md84-85](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L84-L85)

**Sources:**[render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)[README.md84-85](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L84-L85)[README.md96](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L96-L96)

---

## Integration Architecture

The following diagram illustrates how the `coi-serviceworker` interacts with the primary `sw.js` and the Web Worker to maintain the security boundary.

### Security & I/O Entity Mapping

Title: "Cross-Origin Isolation Entity Bridge"

```
Execution Layer

Service Worker Layer

Main Window (Secure Context)

loads

registers

Injects Headers

Injects Headers

Intercepts

Sync XHR

Enables

index.html

coi-serviceworker.min.js

sw.js

COOP: same-origin

COEP: require-corp

/get_input

worker.js (Pyodide)

crossOriginIsolated == true

SharedArrayBuffer
```

### Data Flow for Synchronous Input

Title: "Secure I/O Request Flow"

```
index.js (Main Thread)
coi-serviceworker
sw.js (Input Bridge)
worker.js (Pyodide)
index.js (Main Thread)
coi-serviceworker
sw.js (Input Bridge)
worker.js (Pyodide)
terminal.read() prompts user
Python execution resumes
All above traffic is wrapped in COOP/COEP headers
Sync XHR to "/get_input"
postMessage({type: "INPUT_REQUEST"})
MessageChannel.port2.postMessage(userInput)
HTTP 200 Response (Raw Text)
```

**Sources:**[sw.js133-161](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L133-L161)[README.md54-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L61)[coi-serviceworker.min.js2](https://github.com/NarmakTwo/nuilith/blob/9fa46400/coi-serviceworker.min.js#L2-L2)
