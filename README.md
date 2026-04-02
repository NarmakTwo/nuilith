<div align="center">
  <a href="https://nuilith.onrender.com/" target="_blank">
    <img src="https://nuilith.onrender.com/assets/icon.png" alt="Python Logo" width="80" />
  </a>
  
  <h1>Nuilith Python IDE</h1>
  
  <p>
    <strong>A static, offline-capable Python IDE running entirely in the browser.</strong>
  </p>

  <p>
    <a href="https://nuilith.onrender.com/" target="_blank">
      <img src="https://img.shields.io/badge/View%20Live-nuilith.onrender.com-brightgreen?style=for-the-badge&logo=render" alt="Live Site on Render" />
    </a>
    <a href="https://github.com/NarmakTwo/python-ide/stargazers">
      <img src="https://img.shields.io/github/stars/NarmakTwo/python-ide?style=for-the-badge&logo=github" alt="GitHub Stars" />
    </a>
  </p>

  <p>
    <a href="https://vercel.com/new/clone?repository-url=https://github.com/NarmakTwo/python-ide" target="_blank">
      <img src="https://vercel.com/button" alt="Deploy with Vercel" />
    </a>
    <a href="https://app.netlify.com/start/deploy?repository=https://github.com/NarmakTwo/python-ide" target="_blank">
      <img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify" />
    </a>
    <a href="https://render.com/deploy?repo=https://github.com/NarmakTwo/python-ide" target="_blank">
      <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" />
    </a>
  </p>

  <p>
    <a href="https://deepwiki.com/NarmakTwo/python-ide" target="_blank">
      <img src="https://img.shields.io/badge/deepwiki-documentation-blue" alt="Deepwiki Badge" />
    </a>
  </p>
</div>

---

![Screenshot of Nuilith](/assets/nuilith.png)

---

Nuilith is a static, browser-based Python development environment. It leverages [Pyodide](https://pyodide.org/) (CPython compiled to WebAssembly) to execute Python code entirely on the client side without a backend. Once the initial assets (Pyodide and Pyflakes) are fetched and cached by a Service Worker, the IDE is fully functional offline.

## Core Architecture

Execution and UI rendering are strictly decoupled across three primary domains:

1. **Main Thread (`index.js`)**: Manages the UI layer using Alpine.js for reactive state, CodeMirror (v5) for the code editor, and jQuery Terminal for the output pane. It handles dynamic layout sizing, keyboard event binding, and forwards serialized execution commands to the worker.
2. **Web Worker (`worker.js`)**: Houses the WebAssembly Pyodide runtime environment. It is isolated from the DOM to ensure intensive Python script execution does not lock the browser's UI thread. It parses execution blocks and pipes `stdout`/`stderr` back to the terminal.
3. **Service Worker (`sw.js`)**: Initially responsible for caching core static assets for offline capability, it intrinsically acts as a reverse proxy for handling synchronous OS-level I/O blocking scenarios from the Web Worker.

<details>
<summary><strong>The <code>input()</code> Execution Model</strong></summary>
<br>

A significant challenge in WebAssembly Python runtimes is that native Python's `input()` is a blocking call. Blocking the browser's main thread to await DOM interaction is functionally impossible. Nuilith solves this using a synchronous XMLHttpRequest intercept mechanism:

1. When `input()` is called via Pyodide, the Web Worker drops into a synchronous XHR call to a dummy endpoint (`/get_input`). This suspends the worker thread indefinitely until a response is received.
2. The Service Worker intercepts all outgoing HTTP requests and traps hits to `/get_input`.
3. The Service Worker communicates with the Main Thread via `postMessage`, dispatching a UI event that triggers the jQuery Terminal instance to prompt the user.
4. The Main Thread awaits the user's keystrokes asynchronously. Once submitted, it sends the string back to the Service Worker via a dedicated `MessageChannel`.
5. The Service Worker receives the payload, synthesizes an HTTP 200 response containing the raw text, and manually resolves the intercepted XHR request.
6. The Web Worker's synchronous XHR completes, receiving the user's input string, and Pyodide execution proceeds sequentially.

> **Note on Headers**: This mechanism relies entirely on Cross-Origin Isolation (COI) to unlock precise synchronization primitives and `SharedArrayBuffer` capabilities under Chromium's strict security models. The project utilizes the `coi-serviceworker.min.js` shim to forcefully inject headers. When deploying, ensure `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` are present either via your CDN/Host configuration or the included shim.

</details>

<details>
<summary><strong>Filesystem & Project Management</strong></summary>
<br>

Nuilith features a built-in virtual workspace system backed by the browser's `IndexedDB` API.

- **Persistent Projects Directory**: The `projects` object store tracks metadata for separate workspaces. Each workspace acts as an independent array of virtual `.py` files, active states, and specific `micropip` dependencies.
- **Auto-save Protocol**: The Main Thread captures CodeMirror buffer mutations every 30 seconds (or immediately on execution) and continuously commits the differential state to IndexedDB.
- **Import/Export System (`.nu` Format)**: Entire workspaces can be exported as zipped `.nu` archives via JSZip. This bundles the in-memory Python scripts alongside a `manifest.json` indicating the required PyPI packages for the project wrapper, allowing full environment restoration upon import.

</details>

## Features

- **Runtime Dependency Resolution**: Package imports are automatically detected via static analysis (scanning for `import` statements) prior to execution. The IDE automatically invokes `micropip.install()` to grab pure-Python packages from PyPI dynamically. Note: Packages requiring native C-extensions that haven't been precompiled for WebAssembly in Pyodide are not supported.
- **Interactive Multi-File Editing**: Projects support multiple files cleanly managed through Alpine.js reactive states, allowing code organization beyond single-script buffers.
- **Live Linting**: The worker evaluates Pyflakes payloads silently in the background and surfaces inline squiggle annotations directly inside CodeMirror without stuttering the UI.
- **Zero Configuration Run**: Because it is purely static HTML/JS/CSS, it can run from `npx serve .`, GitHub Pages, AWS S3, or any basic HTTP daemon. *Note: It cannot be run directly via the `file://` protocol, as Service Workers require a secure context (`localhost` or HTTPS).*

## Local Development Environment

Clone the repository and spin up a local web server to bypass CORS limitations:

```bash
git clone https://github.com/NarmakTwo/python-ide
cd python-ide
npx serve .
```

Access the development environment in a modern browser (Chrome or Firefox) via `http://localhost:3000`. 

## Roadmap

Nuilith is evolving! We have ambitious plans for the future and are looking for contributors to help bring these features to life:

- [ ] **Jupyter Notebook Functionality**: Integrate a notebook-style interface option for interactive data science.
- [ ] **Matplotlib Integration**: Enable full data visualization directly in the browser terminal.
- [ ] **Modular & User-Editable UI**: Refactor the architecture to allow users to customize their workspace layout.
- [ ] **Multi-Language Runtimes**: Expand beyond Python to support Node.js, C/C++, Ruby, Go, and Lua.
- [ ] **Backend & Cloud Persistence**: Implement a reliable backend for project hosting and collaboration.
- [ ] **Enhanced Sidebar**: Add a sidebar for file selection, possible extensions, and a more integrated developer experience.
- [ ] **Switch to Monaco**: Switch to the fully featured code editor from VS Code.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details on setup and guidelines.

## Keyboard Shortcuts

- `Ctrl`+`Enter` — Execute script (implicitly saves current buffer to IndexedDB)
- `Ctrl`+`S` — Save raw buffer to IndexedDB manually
- `Ctrl`+`Space` — Trigger CodeMirror autocomplete
- `.` (typing a period after an object reference) — Auto-suggests class/instance methods

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>Made with ❤️ for the Python Community</p>
</div>
