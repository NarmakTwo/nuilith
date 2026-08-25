# Getting Started & Local Development
Relevant source files
- [CONTRIBUTING.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1)
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [manifest.json](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)
- [sitemap.xml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sitemap.xml)

This page provides a technical guide for setting up the Nuilith development environment. Nuilith is a static, browser-based Python IDE that executes code via WebAssembly. Because it relies on Service Workers and Cross-Origin Isolation (COI) to manage synchronous I/O, specific local hosting requirements must be met to ensure the environment functions correctly.

## Local Environment Setup

Nuilith is a purely static application. It does not require a complex backend or database installation. However, it cannot be run by opening `index.html` directly from the file system (the `file://` protocol) because Service Workers require a Secure Context or `localhost`[README.md84-85](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L84-L85)

### 1. Repository Acquisition

Clone the source code from the official repository:

```
git clone https://github.com/NarmakTwo/nuilith
cd nuilith
```

Sources: [README.md90-92](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L90-L92)[CONTRIBUTING.md31-35](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L31-L35)

### 2. Serving the Application

To bypass CORS limitations and enable Service Worker registration, you must use a local HTTP daemon. Any static server will work, provided it serves the root directory.
MethodCommandDefault Port**Node.js (npx)**`npx serve .`3000**Python 3**`python -m http.server 8000`8000
Sources: [README.md93-96](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L93-L96)[CONTRIBUTING.md37-48](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L37-L48)

### 3. Browser Requirements

Nuilith requires a modern browser (Chrome, Edge, or Firefox) that supports:

- **WebAssembly (WASM)**: For the Pyodide runtime.
- **Service Workers**: For offline caching and I/O interception [README.md48-49](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L48-L49)
- **SharedArrayBuffer**: For synchronization between the Main Thread and Web Worker [README.md63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L63-L63)

## PWA Installation & Integration

Nuilith is configured as a Progressive Web App (PWA). This allows it to be "installed" on the host operating system, appearing in the application dock and running in a standalone window without browser address bars.

### PWA Configuration

The application behavior is defined in `manifest.json`. Key configurations include:

- **Display Mode**: Set to `standalone` to provide an IDE-like experience [manifest.json6](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L6-L6)
- **File Handlers**: Nuilith registers itself to handle `.py` (Python source) and `.nu` (Nuilith project bundles) files directly from the OS file explorer [manifest.json26-34](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L26-L34)
- **Theme Color**: Defined as `#1c2130` to match the default "Programiz" UI theme [manifest.json8-9](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L8-L9)

### Installation Flow

1. Navigate to `http://localhost:3000` in a supported browser.
2. Locate the "Install" icon in the browser address bar (Omnibox).
3. Once installed, the IDE can be launched offline. The `sw.js` (Service Worker) will have cached the core logic and Pyodide assets during the first load [README.md40-41](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L40-L41)

Sources: [manifest.json1-35](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L1-L35)[README.md40-41](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L40-L41)

## Development Architecture Overview

When developing locally, it is important to understand how the three primary execution contexts interact. The following diagram maps the high-level system names to their respective code entities.

### Logic Separation & Data Flow

This diagram bridges the conceptual "Layers" to the specific files that implement them.

```
Network/Storage Layer

Worker Context (WASM)

Main Thread (UI Context)

postMessage({type: 'RUN'})

Sync XHR (/get_input)

Intercepts Request

JSZip

Auto-save

index.js (ideState)

worker.js (Pyodide Runtime)

sw.js (Service Worker)

Terminal Prompt

.nu Project Files

IndexedDB (nuilithdb)
```

Sources: [README.md42-49](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L42-L49)[README.md54-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L61)[README.md71-75](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L71-L75)

## Cross-Origin Isolation (COI)

A critical component of local development is ensuring the environment is "Cross-Origin Isolated." This is required to use `SharedArrayBuffer`, which the underlying Pyodide runtime uses for thread synchronization.

Nuilith uses `coi-serviceworker.min.js` to handle this automatically by injecting the following headers into the browser session:

1. `Cross-Origin-Opener-Policy: same-origin`
2. `Cross-Origin-Embedder-Policy: require-corp`

If these headers are missing, the `input()` function in Python will fail because the Web Worker cannot be suspended correctly.

### Input Lifecycle Entity Map

This diagram shows how the code entities interact specifically during a blocking `input()` call.

```
"index.js (Main UI)"
"sw.js (Service Worker)"
"worker.js (Python Runtime)"
"index.js (Main UI)"
"sw.js (Service Worker)"
"worker.js (Python Runtime)"
Executing Python: input('Name?')
"fetch" event listener
Python execution resumes
"XMLHttpRequest (GET /get_input)"
"postMessage({type: 'INPUT_REQUEST'})"
"jQuery Terminal prompt()"
"MessageChannel.postMessage(userInput)"
"HTTP 200 Response (userInput)"
```

Sources: [README.md54-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L61)[README.md63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L63-L63)

## Deployment Configuration

While local development uses `npx serve`, production deployment is handled via the `render.yaml` specification for the Render platform. It defines the service as a `static` environment with no build command, serving the root directory as the `staticPublishPath`.
FilePurpose`render.yaml`Production environment spec [render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)`sitemap.xml`SEO and crawler indexing [sitemap.xml1-17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sitemap.xml#L1-L17)`manifest.json`PWA metadata and file associations [manifest.json1-35](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L1-L35)
Sources: [render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)[sitemap.xml1-17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sitemap.xml#L1-L17)[manifest.json1-35](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L1-L35)
