# micropip Package Manager
Relevant source files
- [index.html](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html)
- [index.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js)
- [worker.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js)

The `micropip` package manager in Nuilith provides a browser-based interface for installing and managing Python packages within the Pyodide runtime. It leverages the `micropip` library to fetch pure-Python wheels from PyPI and install them into the virtual file system of the Web Worker.

## Package Installation Lifecycle

The installation process is a coordinated effort between the Alpine.js UI state in the main thread and the Pyodide engine in the Web Worker.

### 1. UI Trigger and State

The user interacts with the package manager via a dedicated modal. The `ideState` object manages the input through `packageName` and the installation status via `installingPackage`[index.js140-142](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L140-L142) When the user submits a package name, the `installPackage()` function is invoked (typically via the UI).

### 2. Worker Communication

The main thread sends an `INSTALL` message to the `pythonWorker`[index.js64](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L64-L64) This message contains the package name (or an array of names) and an `isSilent` flag used to suppress UI notifications during automated tasks like project switching.

### 3. Pyodide Execution

The Web Worker receives the `INSTALL` type message [worker.js85](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L85-L85) It validates that the Pyodide runtime is initialized [worker.js88-91](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L88-L91) and then executes an asynchronous Python block:

- It imports the `micropip` module [worker.js100](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L100-L100)
- It converts the JavaScript package list to a Python list using `to_py()`[worker.js102](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L102-L102)
- It calls `await micropip.install(pkgs)` to fetch and install the dependencies [worker.js103](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L103-L103)

### 4. Response and Persistence

Upon completion, the worker queries the full list of installed packages using `micropip.list()`[worker.js109](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L109-L109) It sends an `INSTALL_SUCCESS` message back to the main thread [worker.js113-118](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L113-L118) The main thread then:

- Updates `window.ideStateData.installedPackages`[index.js98](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L98-L98)
- Sets `installingPackage` to `false` to stop the UI spinner [index.js99](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L99-L99)
- Persists the list to `localStorage` under the key `installedPackages`[index.js101](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L101-L101)

**Sources:**[index.js95-120](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L95-L120)[worker.js84-128](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L84-L128)

## Data Flow: UI to Python Runtime

The following diagram illustrates the transition from the user's input in the "Natural Language Space" (UI) to the "Code Entity Space" (Worker/Pyodide).

**Package Installation Data Flow**

```
"Pyodide (micropip)"
"worker.js (Web Worker)"
"index.js (Main Thread)"
"Alpine.js (ideState)"
"Pyodide (micropip)"
"worker.js (Web Worker)"
"index.js (Main Thread)"
"Alpine.js (ideState)"
Receive "INSTALL" message
User enters "packageName"
postMessage({type: "INSTALL", package: "name"})
await micropip.install(["name"])
Installation Complete
micropip.list()
["pkg1", "pkg2"]
postMessage({type: "INSTALL_SUCCESS", installedPackages: [...]})
update ideState.installedPackages
localStorage.setItem('installedPackages', ...)
```

**Sources:**[index.js96-106](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L96-L106)[worker.js85-118](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L85-L118)

## Silent Re-installation and Project Switching

To maintain environment consistency across sessions and project swaps, Nuilith implements a silent re-installation protocol.

- **Initial Load:** When `worker.js` sends the `READY` signal, the main thread checks `localStorage` for `installedPackages`[index.js58-61](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L58-L61)
- **Restoration:** If packages are found, it triggers an `INSTALL` message with `isSilent: true`[index.js64](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L64-L64)
- **Suppression:** In the worker, the `isSilent` flag ensures that if an error occurs or the installation succeeds, no toast notifications are displayed to the user [worker.js103-111](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L103-L111)

**Sources:**[index.js58-67](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L58-L67)[worker.js87-125](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L87-L125)

## Implementation Details

### Key Functions and Messages
EntityLocationRole`INSTALL` (Message)[worker.js85](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L85-L85)Triggers the `micropip` installation logic in the worker.`LIST_PACKAGES` (Message)[worker.js131](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L131-L131)Requests the current list of installed packages from the runtime.`installingPackage` (State)[index.js142](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L142-L142)Boolean flag driving the UI loading spinner/indicator.`micropip.install()`[worker.js103](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L103-L103)The underlying Pyodide function that handles wheel resolution.
### Limitations

The package manager is strictly limited to **pure-Python** packages [worker.js103](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L103-L103) Packages that require C-extensions (unless pre-compiled into the Pyodide core) cannot be installed via `micropip` at runtime.

**Sources:**[worker.js100-111](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L100-L111)[index.js136-143](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L136-L143)

## Code Entity Map

This diagram maps the UI components to the specific logic handling package management.

**Package Management Entity Map**

```
Web Worker (worker.js)

Main Thread (index.js)

v-model

postMessage

updates

postMessage

ideState.packageName

UI Input Field

installPackage()

INSTALL Message

pythonWorker.onmessage

ideState.installedPackages

onmessage Handler

pyodide.runPythonAsync

micropip.install()

micropip.list()

INSTALL_SUCCESS Message
```

**Sources:**[index.js95-119](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L95-L119)[worker.js19-21](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L19-L21)[worker.js85-118](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L85-L118)
