# Web Worker — Python Runtime (worker.js)
Relevant source files
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)
- [worker.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js)

The Web Worker acts as the computational engine for Nuilith, hosting the **Pyodide** WebAssembly runtime [README.md47-48](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L47-L48) By offloading Python execution to a background thread, the IDE ensures that intensive scripts or blocking operations (like synchronous input) do not freeze the browser's UI thread [README.md47-48](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L47-L48)

## Pyodide Initialization

The worker initializes by loading the Pyodide library from a CDN and bootstrapping the `micropip` package manager [worker.js4-15](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L4-L15) Once ready, it notifies the Main Thread via a `READY` message [worker.js16](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L16-L16)

### Runtime Setup Logic

1. **Script Import**: Loads `pyodide.js` v0.27.0 [worker.js4](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L4-L4)
2. **Initialization**: Calls `loadPyodide()`[worker.js14](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L14-L14)
3. **Package Prep**: Pre-loads `micropip` to enable dynamic dependency resolution [worker.js15](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L15-L15)
4. **UI Notification**: Dispatches `READY` status [worker.js16](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L16-L16)

**Sources:**[worker.js4-17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L4-L17)[README.md47-48](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L47-L48)

---

## Message Protocol & Implementation

The worker communicates with the Main Thread via a structured messaging protocol handled in the `self.onmessage` event listener [worker.js19](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L19-L19)
Message TypePurposeKey Data Fields`RUN`Executes a full Python script with I/O redirection [worker.js202](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L202-L202)`code``LINT`Runs Pyflakes analysis on the provided code [worker.js22](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L22-L22)`code`, `id``INSTALL`Installs pure-Python packages via micropip [worker.js85](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L85-L85)`package`, `isSilent``EVAL_REPL`Evaluates a single line/block for the REPL [worker.js149](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L149-L149)`code``LIST_PACKAGES`Retrieves a list of currently installed packages [worker.js131](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L131-L131)N/A
### Message Handling Flow

The following diagram illustrates how `worker.js` routes incoming `postMessage` requests to specific Python execution contexts.

**Worker Message Routing (Code Entity Space)**

```

```

**Sources:**[worker.js19-200](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L19-L200)[worker.js202-210](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L202-L210)

---

## I/O Redirection & Environment Patching

To make Pyodide behave like a local terminal, `worker.js` redirects standard streams and patches core Python functions.

### Stream Redirection

The worker utilizes `pyodide.setStdout` and `pyodide.setStderr` to intercept Python's print calls and error traces [worker.js153-164](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L153-L164) These are converted from buffers to strings using `TextDecoder` and forwarded to the UI via `postToUI("PRINT", ...)`[worker.js152-162](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L152-L162)

### Environment Patches

Before execution, the worker applies several patches to the Python environment:

- **`os.system`**: Mocked to support commands like `cls` or `clear`, which trigger a `CLEAR` message to the terminal [worker.js175-181](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L175-L181)
- **`isatty`**: Both `sys.stdout.isatty` and `sys.stderr.isatty` are forced to `True` to enable colored output from libraries like `colorama`[worker.js182-188](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L182-L188)
- **`builtins.input`**: Overridden to use a synchronous `XMLHttpRequest` to `/get_input`, which is intercepted by the Service Worker to facilitate blocking user input [README.md54-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L61)

**Sources:**[worker.js152-164](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L152-L164)[worker.js175-188](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L175-L188)[README.md54-61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L61)

---

## The LintReporter Pipeline

Live linting is achieved by running the `pyflakes` library within the worker. A custom Python class, `LintReporter`, is injected into the runtime to capture syntax errors and warnings [worker.js39-58](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L39-L58)

### Linting Execution Steps

1. **Injection**: The worker sets a global JS variable `self.__lint_code__` with the current editor content [worker.js25](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L25-L25)
2. **Reporter Setup**: A `LintReporter` class is defined in Python, inheriting from `pyflakes.reporter.Reporter`[worker.js39-41](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L39-L41)
3. **Capture**: The `check()` function from `pyflakes.api` processes the code, calling `unexpectedError`, `syntaxError`, or `flake` on the reporter [worker.js43-63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L43-L63)
4. **Serialization**: Results are serialized via `json.dumps(r.errors)` and sent back to the Main Thread as `LINT_RESULT`[worker.js65-74](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L65-L74)

**Linting Data Flow (Natural Language to Code)**

```
"LintReporter (Class)"
"pyflakes.api.check"
"worker.js (Runtime)"
"index.js (Editor)"
"LintReporter (Class)"
"pyflakes.api.check"
"worker.js (Runtime)"
"index.js (Editor)"
Send LINT message (code)
Set self.__lint_code__
Call check(code_str, "main.py", r)
Trigger .flake() or .syntaxError()
Append to self.errors list
json.dumps(r.errors)
postMessage LINT_RESULT (annotations)
```

**Sources:**[worker.js22-81](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L22-L81)

---

## Package Management (micropip)

The worker handles package installation requests by interfacing with `micropip`. It supports installing single packages or arrays of dependencies [worker.js94](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L94-L94)

- **Execution**: Runs `await micropip.install(pkgs)` within the Python context [worker.js103](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L103-L103)
- **State Sync**: After installation, it queries the full list of installed packages using `micropip.list()` to ensure the UI's package manager view is synchronized [worker.js106-118](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L106-L118)
- **Error Handling**: Captures and reports `ImportError` or network failures back to the UI as `INSTALL_ERROR`[worker.js119-126](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L119-L126)

**Sources:**[worker.js85-128](https://github.com/NarmakTwo/nuilith/blob/9fa46400/worker.js#L85-L128)[README.md81](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L81-L81)
