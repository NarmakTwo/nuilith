# Package Management & Linting
Relevant source files
- [index.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js)
- [worker.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js)

Nuilith provides a dynamic development environment by integrating real-time code analysis and a flexible package management system. Both subsystems rely on the [Web Worker — Python Runtime (worker.js)](/NarmakTwo/python-ide/2.2-web-worker-python-runtime-(worker.js)) to execute Python-based logic without blocking the main UI thread.

## micropip Package Manager

The package management system allows users to install pure-Python libraries directly from PyPI into the browser-based environment using `micropip`. The lifecycle is managed through a bridge between the Alpine.js `ideState` and the Pyodide worker.

### Installation Lifecycle

1. **UI Trigger**: The user enters a package name into the `packageName` model and triggers `installPackage()`[index.js140-142](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L140-L142)
2. **Worker Communication**: The main thread sends an `INSTALL` message to the worker [index.js64](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L64-L64)
3. **Pyodide Execution**: The worker uses `micropip.install()` to fetch and load the package [worker.js100-103](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L100-L103)
4. **State Synchronization**: Upon success, the worker returns an `INSTALL_SUCCESS` message containing the updated list of installed packages [worker.js113-118](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L113-L118)
5. **Persistence**: The list of installed packages is persisted to `localStorage`[index.js101](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L101-L101) On project reload or worker restart, these packages are silently re-installed to maintain environment consistency [index.js58-67](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L58-L67)

### Package Manager Entity Map

The following diagram maps the UI interaction to the internal messaging and Python execution entities.

```
Web Worker (Code Entity Space)

Main Thread (UI Space)

Submit

postMessage({type: 'INSTALL'})

Update

Persist

onmessage

await

Calls

Success

postMessage

ideState.packageName

installPackage()

pythonWorker

INSTALL_SUCCESS Handler

ideState.installedPackages

localStorage: installedPackages

worker.js: INSTALL handler

pyodide.runPythonAsync

micropip.install(pkgs)

micropip.list()
```

Sources: [index.js56-119](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L56-L119)[index.js136-143](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L136-L143)[worker.js85-128](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L85-L128)

For details on the installation lifecycle and UI feedback, see [micropip Package Manager](/NarmakTwo/python-ide/6.1-micropip-package-manager).

---

## Live Linting with Pyflakes

Nuilith implements live "as-you-type" linting by piping the editor's content through `pyflakes`. This ensures that syntax errors and common logical issues (like unused imports or undefined variables) are highlighted immediately within the CodeMirror interface.

### The Linting Pipeline

- **Async Request**: The linting process is registered as an asynchronous helper in CodeMirror via `pythonLint`[index.js123-132](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L123-L132)
- **Request Tracking**: To prevent race conditions, each request is assigned a `lintRequestId`. The `pendingLintCallback` ensures that only the result of the most recent request is rendered [index.js10-11](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L10-L11)[index.js125-127](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L125-L127)
- **Python Reporter**: Inside the worker, a custom Python class `LintReporter` (inheriting from `pyflakes.reporter.Reporter`) captures errors and warnings, converting them into a JSON-serializable format [worker.js39-58](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L39-L58)
- **Annotation Rendering**: Results are mapped to CodeMirror "annotations," which define the `line`, `ch` (character), and `severity` (error vs warning) for the editor gutter and squiggles [index.js67-72](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L67-L72)

### Linting Pipeline Data Flow

This diagram illustrates how code text is transformed into UI annotations through the Pyflakes integration.

```
worker.js (Python Environment)

index.js (Orchestrator)

CodeMirror Editor

Report via

JSON Result

callback(annotations)

Editor Content

pythonLint(text, callback)

lintRequestId++

pendingLintCallback

LINT Message Handler

class LintReporter(Reporter)

pyflakes.api.check()
```

Sources: [index.js10-11](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L10-L11)[index.js123-132](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L123-L132)[worker.js22-82](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L22-L82)

For details on the `LintReporter` implementation and CodeMirror integration, see [Live Linting with Pyflakes](/NarmakTwo/python-ide/6.2-live-linting-with-pyflakes).
