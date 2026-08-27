# CodeMirror Editor Configuration
Relevant source files
- [index.html](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html)
- [index.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js)
- [programiz-inspired.css](https://github.com/NarmakTwo/nuilith/blob/9fa46400/programiz-inspired.css)

The Nuilith IDE utilizes **CodeMirror v5** as its primary text editing engine. The configuration is designed to provide a rich, IDE-like experience within the browser, featuring Python-specific syntax highlighting, advanced navigation through keymaps, and real-time code analysis via a web worker-based linting pipeline.

## Editor Initialization and Core Setup

The editor is instantiated and attached to the `globalThis.myCodeMirror` variable within the `index.js` file. It is configured to use `python` mode for syntax highlighting and includes several essential UI components like line numbers and a custom gutter for code folding and linting markers.

### Core Configuration Object

The editor is initialized with a configuration object that pulls initial values from the `ideState` Alpine.js data model, which in turn retrieves persisted settings from `localStorage`.
PropertyDescriptionImplementation`mode`Set to `python` for language-specific parsing.[index.js316](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L316-L316)`theme`Defaults to `programiz` or the user-selected theme.[index.js317](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L317-L317)`lineNumbers`Toggles the left-hand line numbering gutter.[index.js318](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L318-L318)`indentUnit`Standardized to 4 spaces for Python.[index.js321](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L321-L321)`gutters`Defines containers for line numbers, folding, and linting.[index.js324](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L324-L324)
**Sources:**[index.js315-333](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L315-L333)[index.html53-54](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L53-L54)

## Feature Implementation

### Keymaps (Vim & Emacs)

Nuilith supports alternative input modes by loading external CodeMirror keymap scripts. The `keybindings` property in `ideState` determines which keymap is active.

- **Vim:** Loaded via `keymap/vim.js`[index.html93](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L93-L93)
- **Emacs:** Loaded via `keymap/emacs.js`[index.html94](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L94-L94)
- **Default:** Standard browser-based text editing.

### Bracket Mastery & Active Line

The "Bracket Mastery" feature combines two CodeMirror addons:

1. **Match Brackets:** Highlights the corresponding opening/closing bracket when the cursor is adjacent to one [index.html85](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L85-L85)
2. **Auto-Close Brackets:** Automatically inserts a closing bracket/quote when the opening one is typed [index.html79](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L79-L79)

Active line highlighting is managed by the `active-line.js` addon [index.html86](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L86-L86) which applies a specific CSS class to the line containing the cursor for better visibility.

### Code Folding

Folding is implemented using the `foldgutter.js` addon. It supports:

- **Indent Fold:** Folds blocks based on Python indentation levels [index.html83](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L83-L83)
- **Brace Fold:** Folds blocks enclosed in curly or square brackets [index.html84](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L84-L84)

**Sources:**[index.js327-331](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L327-L331)[index.html79-86](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L79-L86)

## Live Linting Pipeline

Nuilith implements asynchronous linting using **Pyflakes**. Because the linting process (running in Pyodide) can be computationally expensive, it is offloaded to a Web Worker to prevent UI blocking.

### Linting Data Flow

The linting process follows a request-response cycle between the Main Thread and the `worker.js`.

1. **Registration:** A custom lint helper is registered via `CodeMirror.registerHelper("lint", "python", pythonLint)`[index.js132](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L132-L132)
2. **Trigger:** As the user types, CodeMirror calls `pythonLint`.
3. **Dispatch:**`pythonLint` generates a `lintRequestId`, stores a callback in `pendingLintCallback`, and sends a `LINT` message to the worker [index.js125-129](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L125-L129)
4. **Processing:** The worker executes Pyflakes and returns a `LINT_RESULT` message.
5. **Rendering:** The `pythonWorker.onmessage` handler identifies the matching request ID and executes the callback to render markers in the editor gutter [index.js68-71](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L68-L71)

**Editor-to-Worker Linting Flow**

```
pythonWorker (Web Worker)
pythonLint Function
CodeMirror (Main Thread)
pythonWorker (Web Worker)
pythonLint Function
CodeMirror (Main Thread)
Runs Pyflakes via Pyodide
Render Gutter Icons
Trigger Lint (text, callback)
Increment lintRequestId
Store callback in pendingLintCallback
postMessage({type: "LINT", code, id})
postMessage({type: "LINT_RESULT", id, annotations})
callback(annotations)
```

**Sources:**[index.js123-132](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L123-L132)[index.js68-71](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L68-L71)

## Theme: Programiz

The default `programiz` theme is a custom-built CSS skin designed to mimic high-end Python IDEs. It is defined in `programiz-inspired.css` and targets specific CodeMirror token classes.

### Syntax Highlighting Classes

The theme maps CodeMirror's internal token types to specific colors:
Token ClassCode EntityColor Hex`.cm-keyword``def`, `class`, `if`, `return``#CDA869``.cm-builtin``print()`, `len()`, `range()``#dcdcaa``.cm-string`String literals`#8F9D6A``.cm-comment`Python comments (`#`)`#57a64a``.cm-variable-2``self`, `cls``#5b8db8`
### System Name to Code Entity Mapping

This diagram bridges the visual themes and editor settings to the underlying code properties in the `ideState`.

**UI Configuration Mapping**

```
Code Entity Space (Alpine.js / CodeMirror)

Natural Language (UI Settings)

setOption

'Theme Selection'

'Keybindings'

'Font Size'

'Line Wrapping'

ideState.theme

ideState.keybindings

ideState.fontSize

ideState.lineWrapping

myCodeMirror.setOption('theme', ...)

myCodeMirror.setOption('keyMap', ...)

#editor .CodeMirror { font-size: ... }

myCodeMirror.setOption('lineWrapping', ...)
```

**Sources:**[programiz-inspired.css1-127](https://github.com/NarmakTwo/nuilith/blob/9fa46400/programiz-inspired.css#L1-L127)[index.js157-164](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L157-L164)[index.js401-445](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L401-L445)

## Auto-Save and Persistence

The editor state is persisted every 30 seconds if changes are detected. This logic is handled by a `setInterval` in `index.js`.

1. **Detection:** The system compares the current timestamp with `globalThis.autosaveTime`.
2. **Action:** If 30 seconds have passed, it calls `saveFile(activeFile, myCodeMirror.getValue())`.
3. **Storage:** The content is written to the `projects` object store in IndexedDB (`nuilithdb`).

**Sources:**[index.js8](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L8-L8)[index.js14-16](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L14-L16)[index.js335-341](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L335-L341)
