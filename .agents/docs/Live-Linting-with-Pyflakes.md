# Live Linting with Pyflakes
Relevant source files
- [index.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js)
- [worker.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js)

The Nuilith IDE provides real-time Python linting by integrating the `pyflakes` library within the Pyodide Web Worker. This system identifies syntax errors and common logical issues (like unused imports or undefined variables) as the user types, displaying them as inline annotations in the CodeMirror editor.

## The Linting Pipeline

The linting process is asynchronous to ensure that the UI thread remains responsive during code analysis. It follows a request-response pattern mediated by a unique request ID to prevent race conditions from rapid typing.

### Data Flow Diagram: Editor to Worker

This diagram illustrates the transition from the "Natural Language Space" of user typing to the "Code Entity Space" of the linting implementation.

**Linting Request Lifecycle**

```
Result Resolution

Web Worker (worker.js)

Main Thread (index.js)

User Types in CodeMirror

pythonLint(text, callback)

Increment lintRequestId

Set pendingLintCallback

pythonWorker.postMessage({type: 'LINT', ...})

self.onmessage handler

pyodide.runPythonAsync(LintReporter logic)

pyflakes.api.check(code, 'main.py', reporter)

json.dumps(r.errors)

postMessage({type: 'LINT_RESULT', id, annotations})

pythonWorker.onmessage

Execute pendingLintCallback(id, annotations)

CodeMirror Rendering
```

**Sources:**[index.js123-132](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L123-L132)[worker.js19-82](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L19-L82)

---

## Implementation Details

### Main Thread: `pythonLint` and Callback Tracking

The linting logic is registered as a CodeMirror lint helper. Because Pyodide runs in a separate worker, the helper is marked as `async`.

- **`lintRequestId`**: A counter incremented for every new lint request [index.js11](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L11-L11)
- **`pendingLintCallback`**: A global reference that stores the resolution logic for the most recent request [index.js10](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L10-L10)
- **Request Validation**: When a `LINT_RESULT` message returns from the worker, the system compares the returned `id` with the local `id` to ensure that stale results from previous keystrokes do not overwrite newer ones [index.js126-128](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L126-L128)

**Sources:**[index.js10-11](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L10-L11)[index.js123-132](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L123-L132)

### Web Worker: The `LintReporter` Class

Inside `worker.js`, Nuilith defines a custom Python class, `LintReporter`, which inherits from `pyflakes.reporter.Reporter`. This class overrides standard output methods to collect errors into a structured list instead of printing them to `stdout`.
MethodRoleData Collected`unexpectedError`Handles internal pyflakes failures.Message, Severity: error [worker.js43-44](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L43-L44)`syntaxError`Handles Python syntax violations.Line, Offset, Message, Severity: error [worker.js45-51](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L45-L51)`flake`Handles logical warnings (e.g., unused variables).Line, Column, Message, Severity: warning [worker.js52-58](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L52-L58)
**Sources:**[worker.js39-58](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L39-L58)

### Pyflakes Integration

The worker ensures `pyflakes` is available using `micropip` before execution [worker.js29-33](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L29-L33) The code is passed from JavaScript to Python via the `self.__lint_code__` global [worker.js25](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L25-L25) then accessed in Python using `js.count_code.to_py()`[worker.js61-62](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L61-L62)

The analysis is triggered by calling `pyflakes.api.check(code_str, "main.py", r)`[worker.js63](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L63-L63)

**Sources:**[worker.js22-64](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L22-L64)

---

## CodeMirror Annotation Rendering

Once the worker returns the linting results, the main thread maps the Python-based error coordinates to CodeMirror's annotation format.

**Entity Mapping: Python Error to CodeMirror Annotation**

```
JavaScript Entity (CodeMirror Annotation)

Python Entity (LintReporter.errors)

Direct Map

Direct Map

ch + 1

String split/clean

Error Object

line

ch

message

Annotation

from: {line, ch}

to: {line, ch}

severity
```

### Formatting Logic

The worker performs the final transformation of the raw `LintReporter` data into the format expected by the `addon/lint/lint.js` helper:

1. **Range Calculation**: The `from` position is the exact coordinate provided by pyflakes. The `to` position is calculated as `ch + 1` to highlight at least one character [worker.js67-72](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L67-L72)
2. **Message Cleaning**: Pyflakes messages are often prefixed with the filename; the worker strips this to provide a cleaner UI message [worker.js56](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L56-L56)
3. **Severity Mapping**: Syntax errors are explicitly marked as `"error"`, while standard "flakes" default to `"warning"`[worker.js50-57](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L50-L57)

**Sources:**[worker.js46-58](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L46-L58)[worker.js67-72](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L67-L72)

## Error Handling

If the linting process itself fails (e.g., a Pyodide crash or a `pyflakes` import error), a catch block generates a generic error annotation at line 0 to alert the user that the linter is offline [worker.js76-80](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L76-L80)

**Sources:**[worker.js76-80](https://github.com/NarmakTwo/python-ide/blob/9fa46400/worker.js#L76-L80)
