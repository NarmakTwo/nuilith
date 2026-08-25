# Nuilith Python IDE — Overview
Relevant source files
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [assets/icon.png](https://github.com/NarmakTwo/nuilith/blob/9fa46400/assets/icon.png)
- [assets/nuilith.png](https://github.com/NarmakTwo/nuilith/blob/9fa46400/assets/nuilith.png)
- [index.html](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)

Nuilith is a high-performance, static, and offline-capable Python Integrated Development Environment (IDE) that operates entirely within the web browser. By leveraging **Pyodide** (CPython compiled to WebAssembly), Nuilith executes Python code on the client side, eliminating the need for a backend server while providing a near-native development experience.

## System Architecture at a Glance

Nuilith utilizes a decoupled three-layer architecture to ensure that intensive Python execution does not interfere with the responsiveness of the User Interface.

- **Main Thread (`index.js`)**: Manages the UI state via Alpine.js, handles the CodeMirror editor, and controls the jQuery Terminal [index.js1-15](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1-L15)
- **Web Worker (`worker.js`)**: Isolated runtime environment for Pyodide. It executes Python scripts and pipes output back to the main thread [worker.js1-10](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L1-L10)
- **Service Worker (`sw.js`)**: Acts as a caching proxy for offline use and a bridge for synchronous I/O operations [sw.js1-12](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L1-L12)

### Component Interaction Diagram

This diagram maps high-level system components to their corresponding code entities and communication channels.

```
Web Worker (Execution Space)

Main Thread (UI Space)

postMessage({type: 'RUN'})

Buffer Updates

User Input

postMessage({type: 'STDOUT'})

Synchronous XHR (/get_input)

MessageChannel

Service Worker (Network/IO Bridge)

index.js (ideState)

worker.js (Pyodide Runtime)

CodeMirror Editor

jQuery Terminal

sw.js (Fetch Interceptor)
```

Sources: [index.js1-50](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1-L50)[worker.js1-40](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L1-L40)[sw.js1-30](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sw.js#L1-L30)[README.md42-49](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L42-L49)

## Key Subsystems

### 1. Synchronous Input Model

Standard Python `input()` is a blocking call, which is natively incompatible with the asynchronous nature of JavaScript. Nuilith resolves this by using a synchronous `XMLHttpRequest` to a dummy endpoint (`/get_input`) that is intercepted by the Service Worker [README.md54-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L61) This suspends the Web Worker thread until the Main Thread provides the user's input.

For details, see [Synchronous input() Execution Model](/NarmakTwo/nuilith/3-synchronous-input()-execution-model).

### 2. Virtual File System & Persistence

Nuilith implements a multi-project workspace system using **IndexedDB**.

- **Storage**: Projects and files are stored in the `projects` object store [index.js235-250](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L235-L250)
- **Auto-save**: The system triggers a save every 30 seconds or upon code execution [index.js215-220](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L215-L220)
- **Portability**: Users can export projects as `.nu` files, which are JSZip archives containing the source code and a `manifest.json` for dependencies [index.js1145-1160](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1145-L1160)

For details, see [Project & File System](/NarmakTwo/nuilith/4-project-and-file-system).

### 3. Package Management & Static Analysis

The IDE supports pure-Python packages from PyPI. Before execution, Nuilith performs static analysis on the code to detect `import` statements and automatically triggers `micropip.install()` for missing dependencies [worker.js180-200](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L180-L200)

For details, see [Package Management & Linting](/NarmakTwo/nuilith/6-package-management-and-linting).

## Code Entity Map

The following diagram bridges natural language features to specific classes and functions within the codebase.

```
Code Entity Space

Feature Space

Live Linting

Package Install

Project Export

Terminal Output

worker.js: LintReporter

worker.js: micropip.install

index.js: exportProject()

index.js: term.echo()
```

Sources: [worker.js145-160](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L145-L160)[index.js1147-1155](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1147-L1155)[index.js350-365](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L350-L365)[README.md81-83](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L81-L83)

## Technical Requirements

- **Cross-Origin Isolation**: Required for `SharedArrayBuffer` and thread synchronization. This is handled by `coi-serviceworker.min.js`[index.html50](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L50-L50)
- **Secure Context**: Must be served over `https://` or `localhost` to enable Service Workers [README.md84](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L84-L84)

## Child Pages

- **[Features & User Guide](/NarmakTwo/nuilith/1.1-features-and-user-guide)**: Detailed guide on using the IDE, Zen Mode, and keyboard shortcuts.
- **[Getting Started & Local Development](/NarmakTwo/nuilith/1.2-getting-started-and-local-development)**: Instructions for setting up the development environment and PWA installation.

Sources: [README.md1-107](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L1-L107)[index.html1-100](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L1-L100)[render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)
