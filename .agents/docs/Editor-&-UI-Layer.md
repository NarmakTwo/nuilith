# Editor & UI Layer
Relevant source files
- [index.html](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html)
- [index.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js)
- [style.css](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css)

The Editor & UI Layer of Nuilith provides a modern, responsive, and feature-rich interface for Python development entirely within the browser. It leverages a combination of **CodeMirror v5** for code editing, **jQuery Terminal** for execution output and REPL interaction, and **Alpine.js** for reactive state management. The layout is built using a custom glassmorphism design system implemented via **Tailwind CSS** and **DaisyUI**.

### System Architecture Overview

The UI is structured as a dual-pane layout where the code editor and the terminal output reside in flexible containers. The state of these components is synchronized through a central Alpine.js data object, ensuring that settings like themes, font sizes, and UI toggles are applied consistently across the application.

#### UI Component Relationship

This diagram illustrates how the main UI entities interact to form the IDE interface.

"UI Component Architecture"

```
Main Window [index.html]

Right Pane [#output]

Left Pane [#left-pane]

Reactive Sync

Reactive Sync

State Control

State Control

Resizes

Resizes

ideState (Alpine.js)

Toolbar Left

myCodeMirror (CodeMirror)

Toolbar Right

term (jQuery Terminal)

pane-divider

#left-pane

#output
```

Sources: [index.html121-134](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L121-L134)[index.js135-185](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L135-L185)[style.css126-134](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L126-L134)

---

### CodeMirror Editor

The primary code editing experience is powered by CodeMirror v5. It is configured to support Python-specific features including syntax highlighting, code folding, and bracket matching. The editor is initialized in the global scope as `myCodeMirror` and is dynamically updated when the user switches files or modifies settings.

**Key Features:**

- **Live Linting:** Integrates with a Pyflakes-based worker to provide real-time code analysis [index.js123-132](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L123-L132)
- **Keymaps:** Supports `Vim` and `Emacs` modes in addition to standard keybindings [index.html93-94](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L93-L94)
- **Theme Integration:** Uses a custom `programiz` theme and supports standard CodeMirror themes via CSS variables [index.html56-69](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L56-L69)

For details, see [CodeMirror Editor Configuration](/NarmakTwo/nuilith/5.1-codemirror-editor-configuration).

Sources: [index.js7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L7-L7)[index.js123-132](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L123-L132)[index.html53-69](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L53-L69)

---

### Terminal & REPL

The execution environment and REPL are handled by jQuery Terminal. It serves as the standard output (`stdout`) and standard error (`stderr`) for the Python worker.

**Terminal Behavior:**

- **Output Handling:** Captures `PRINT` and `ERROR` messages from the `pythonWorker` and renders them [index.js72-89](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L72-L89)
- **Input Interception:** Supports a synchronous input model where the terminal prompts the user and sends data back to the worker via a Service Worker bridge.
- **REPL Mode:** When `inRepl` is true, the terminal accepts direct Python commands and sends them for evaluation [index.js165](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L165-L165)

Sources: [index.js6](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L6-L6)[index.js72-94](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L72-L94)[index.html102-104](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.html#L102-L104)

---

### State Management with Alpine.js

The entire UI state is managed by the `ideState` Alpine.js component. This object tracks everything from file contents to UI visibility (e.g., `zenMode`, `settingsOpen`).
PropertyPurpose`activeFile`Tracks the currently open file in the editor [index.js181](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L181-L181)`running`Boolean flag indicating if a Python script is currently executing [index.js138](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L138-L138)`theme`Stores the current UI and editor theme ID [index.js157](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L157-L157)`zenMode`Toggles a distraction-free interface [index.js154](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L154-L154)
For details, see [Alpine.js State Management](/NarmakTwo/nuilith/5.3-alpine.js-state-management).

Sources: [index.js135-185](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L135-L185)

---

### Layout & Styling

The Nuilith UI uses a "glassmorphism" aesthetic, characterized by semi-transparent backgrounds and backdrop filters. The layout is a responsive flexbox design that switches from a side-by-side view to a stacked view on smaller screens.

**Visual Entities & Code Identifiers**
This diagram maps visual layout concepts to their specific CSS and HTML identifiers.

"Visual Layout Mapping"

```
HTML Structure [index.html]

CSS Layout [style.css]

Between

Between

#doublepanel (Flex Container)

.pane (Glassmorphism)

.pane-divider (Resize Handle)

#left-pane

#output

.toolbar
```

Sources: [style.css68-78](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L68-L78)[style.css87-97](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L87-L97)[style.css99-113](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L99-L113)

**Custom Components:**

- **Theming:** Implemented via CSS variables defined in `:root`[style.css1-8](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L1-L8)
- **Custom Toggles:** Since DaisyUI v5 components sometimes conflict with the Tailwind browser runtime, Nuilith uses a custom CSS implementation for `input.toggle`[style.css173-216](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L173-L216)
- **Responsive Breakpoints:** A media query at `900px` collapses the horizontal panes into a vertical stack [style.css99-113](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L99-L113)

For details, see [Themes & CSS Styling](/NarmakTwo/nuilith/5.2-themes-and-css-styling).

Sources: [style.css1-8](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L1-L8)[style.css68-78](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L68-L78)[style.css173-216](https://github.com/NarmakTwo/nuilith/blob/9fa46400/style.css#L173-L216)
