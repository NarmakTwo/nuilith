# Development Workflow
Relevant source files
- [CONTRIBUTING.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1)
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)

This page outlines the standardized procedure for contributing to the Nuilith Python IDE. Because Nuilith is a purely static application relying on browser-level technologies like WebAssembly (Pyodide), Web Workers, and Service Workers, the development environment requires specific configurations to bypass security restrictions and test cross-thread communication.

## Local Environment Setup

Nuilith cannot be executed by opening `index.html` directly via the `file://` protocol. Service Workers and `SharedArrayBuffer` (required for synchronous input) necessitate a **Secure Context** (HTTPS or `localhost`) and specific HTTP headers [README.md84-85](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L84-L85)

### 1. Cloning and Branching

Contributors should follow the standard GitHub fork-and-pull model:

1. Fork the repository at `https://github.com/NarmakTwo/nuilith`.
2. Clone your fork locally: `git clone https://github.com/NarmakTwo/nuilith`[CONTRIBUTING.md31-33](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L31-L33)
3. Create a feature branch from `main`: `git checkout -b feature/your-feature-name`[CONTRIBUTING.md52](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L52-L52)

### 2. Running a Local Server

You must serve the project directory through a web server to enable Service Worker registration [CONTRIBUTING.md37-39](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L37-L39)
MethodCommandAccess URL**Node.js (npx)**`npx serve .``http://localhost:3000`**Python 3**`python -m http.server 8000``http://localhost:8000`
Sources: [README.md88-96](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L88-L96)[CONTRIBUTING.md37-48](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L37-L48)

## Implementation & Testing Flow

When modifying the codebase, developers must account for the decoupled architecture consisting of the Main Thread, Web Worker, and Service Worker.

### Cross-Origin Isolation (COI)

The development server must support Cross-Origin Isolation headers to enable `SharedArrayBuffer`. Nuilith uses `coi-serviceworker.min.js` to inject these headers if the host does not provide them [README.md63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L63-L63)

**Required Headers:**

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

### Testing Service Worker Logic

Since `sw.js` acts as a proxy for the `/get_input` endpoint [README.md57-58](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L57-L58) any changes to the input lifecycle or caching strategy require a Service Worker update.

- **Tip:** Use the "Update on reload" setting in Browser DevTools (Application tab) to ensure the latest `sw.js` is active during development.

### Development Data Flow Diagram

The following diagram illustrates how a contributor's local changes flow through the system during a "Run" operation.

**Code Entity Interaction during Development**

```
Browser Runtime

Local Filesystem

Served via localhost

Spawned by Main Thread

Registered by Main Thread

Sync XHR to /get_input

postMessage

MessageChannel

HTTP 200 Response

index.js (UI Logic)

worker.js (Pyodide)

sw.js (Proxy/Cache)

Main Thread (Alpine.js ideState)

Web Worker (Python Runtime)

Service Worker (Interception)
```

Sources: [README.md42-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L42-L61)[CONTRIBUTING.md37-45](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L37-L45)

## Pull Request Requirements

Before submitting a Pull Request (PR), ensure the following criteria are met:

### 1. Feature Integrity

- **Responsive Design:** Verify that UI changes work on both desktop and mobile layouts [CONTRIBUTING.md54](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L54-L54)
- **Theme Consistency:** Ensure new components adhere to the glassmorphism and CSS variable system used by the theme engine [CONTRIBUTING.md54](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L54-L54)
- **Persistence:** If modifying the file system, verify that `IndexedDB` correctly migrates or stores the new data structures [README.md71-74](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L71-L74)

### 2. Documentation Updates

If a PR adds new functionality, the contributor is required to update the relevant documentation:

- **README.md**: Update feature lists or architecture notes [CONTRIBUTING.md55](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L55-L55)
- **Wiki Pages**: Update technical details in the 1.x through 8.x series as appropriate.

### 3. Submission Process

1. Push your changes to your fork.
2. Open a PR against the `main` branch of the upstream repository [CONTRIBUTING.md56](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L56-L56)
3. Provide a clear description following the templates:

- **Bugs:** Include reproduction steps and expected vs. actual behavior [CONTRIBUTING.md10-14](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L10-L14)
- **Enhancements:** Explain the utility and provide a step-by-step description [CONTRIBUTING.md18-20](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L18-L20)

## Deployment Configuration

Nuilith is configured for zero-build deployment. The `render.yaml` file specifies that no build command is required, and the static files are served directly from the root [render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)

**Deployment Pipeline Diagram**

```
Hosting Provider (Render/Vercel)

GitHub Repository

staticPublishPath: .

coi-serviceworker.min.js

Source Code (main branch)

render.yaml

Static Web Service

COOP/COEP Headers
```

Sources: [render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)[README.md63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L63-L63)[README.md21-31](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L21-L31)

---

Sources: [README.md1-107](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L1-L107)[CONTRIBUTING.md1-71](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L1-L71)[render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)
