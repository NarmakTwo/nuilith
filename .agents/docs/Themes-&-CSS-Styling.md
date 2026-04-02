# Themes & CSS Styling
Relevant source files
- [index.html](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html)
- [programiz.css](https://github.com/NarmakTwo/python-ide/blob/9fa46400/programiz.css)
- [style.css](https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css)

This page documents the Nuilith visual engine, including the theme synchronization between the UI and CodeMirror, the flexible glassmorphism layout, and custom component implementations designed to bypass framework limitations.

## Theme Engine & CSS Variables

Nuilith utilizes a centralized theme engine that synchronizes global CSS variables with CodeMirror theme classes. The system is driven by an array of theme metadata objects defined within the Alpine.js `ideState`.

### Theme Metadata Structure

The `themes` array in `ideState` contains objects with the following properties:

- `name`: The display name in the settings UI.
- `value`: The internal identifier used for logic.
- `cmTheme`: The specific class name required by CodeMirror (e.g., `material-darker`, `nord`).
- `bg`, `fg`, `menu`, `hil`: Hex codes used to update CSS variables dynamically.

### `setTheme()` Implementation

When a user selects a theme, the `setTheme()` function performs three primary actions:

1. Updates the `data-theme` attribute on the `<html>` element `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html#L2-L2" min=2  file-path="index.html">Hii</FileRef>`.
2. Updates the `ideState.theme` reactive property `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L156-L157" min=156 max=157 file-path="index.js">Hii</FileRef>`.
3. Injects the theme's color palette into the document's `:root` CSS variables `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L159-L163" min=159 max=163 file-path="index.js">Hii</FileRef>`.

VariableRoleCSS Usage`--bg`Primary background`body`, `#editor`, `#terminal``<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L27-L117" min=27 max=117 file-path="style.css">Hii</FileRef>``--fg`Primary text color`body`, `#terminal`, `.CodeMirror``<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L28-L118" min=28 max=118 file-path="style.css">Hii</FileRef>``--menu`Toolbar background`#toolbar-left`, `#toolbar-right``<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L82-L82" min=82  file-path="style.css">Hii</FileRef>``--hil`Accent/Highlight color`.clickable`, `.clickbutton`, `.pane-divider:hover``<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L14-L96" min=14 max=96 file-path="style.css">Hii</FileRef>`
**Sources:**`<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L146-L168" min=146 max=168 file-path="index.js">Hii</FileRef>`, `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L1-L8" min=1 max=8 file-path="style.css">Hii</FileRef>`, `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html#L2-L7" min=2 max=7 file-path="index.html">Hii</FileRef>`

## Layout & Glassmorphism

The IDE uses a dual-pane flexbox layout that supports both horizontal (desktop) and vertical (mobile) orientations.

### Dual-Pane Flexbox

The main workspace is wrapped in a `#doublepanel` container.

- **Desktop:** Uses `flex-direction: row`. The `#left-pane` (Editor) and `#output` (Terminal) are separated by a `.pane-divider``<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L87-L93" min=87 max=93 file-path="style.css">Hii</FileRef>`.
- **Mobile:** Triggered at `@media (max-width: 900px)`, the layout switches to `flex-direction: column` and hides the divider `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L99-L113" min=99 max=113 file-path="style.css">Hii</FileRef>`.

### Pane Styling

Panes utilize a "glassmorphism" effect achieved through transparency and backdrop filters:

- **Transparency:**`background: rgba(255, 255, 255, 0.02)``<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L69-L69" min=69  file-path="style.css">Hii</FileRef>`.
- **Blur:**`backdrop-filter: blur(8px)``<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L70-L70" min=70  file-path="style.css">Hii</FileRef>`.
- **Borders:** A 1px solid border with low opacity `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L75-L75" min=75  file-path="style.css">Hii</FileRef>`.

### Component Layout Flow

The following diagram illustrates how the CSS classes and IDs map to the structural layout of the application.

**Diagram: UI Layout Entity Mapping**

```
Right Pane Entity

Divider Entity

Left Pane Entity

Main Container

body (var(--bg))

#doublepanel (Flex)

.pane #left-pane

#toolbar-left (var(--menu))

#editor (CodeMirror)

.pane-divider

.pane #output

#toolbar-right (var(--menu))

#terminal (jQuery Terminal)
```

**Sources:**`<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L50-L134" min=50 max=134 file-path="style.css">Hii</FileRef>`, `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.html#L250-L410" min=250 max=410 file-path="index.html">Hii</FileRef>`

## Custom UI Components

Nuilith implements custom CSS for interactive components to avoid conflicts between Tailwind CSS and DaisyUI v5 runtime behaviors.

### Custom Toggle Switch

Because DaisyUI v5 `@layer` nesting occasionally conflicts with the Tailwind browser runtime, the IDE uses a bespoke toggle implementation `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L173-L212" min=173 max=212 file-path="style.css">Hii</FileRef>`.

- **Mechanism:** Uses the `:checked::after` pseudo-element to handle the sliding "knob" transition via `transform: translateX()``<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L208-L211" min=208 max=211 file-path="style.css">Hii</FileRef>`.
- **Variants:** Includes semantic color classes like `.toggle-success` and `.toggle-error``<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L218-L237" min=218 max=237 file-path="style.css">Hii</FileRef>`.

### Custom Range Slider

The font-size and auto-save interval sliders use a custom `-webkit-slider-thumb` styling to match the IDE's aesthetic, ensuring consistent appearance across Chrome and Firefox `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L240-L268" min=240 max=268 file-path="style.css">Hii</FileRef>`.

**Sources:**`<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/style.css#L170-L269" min=170 max=269 file-path="style.css">Hii</FileRef>`

## Programiz CodeMirror Theme

While Nuilith supports standard CodeMirror themes (Nord, Dracula, Monokai), it defaults to a custom `programiz` theme defined in `programiz.css`.

### Visual Characteristics

- **Background:**`#1C2130` (Deep Navy) `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/programiz.css#L2-L2" min=2  file-path="programiz.css">Hii</FileRef>`.
- **Typography:** Uses 'Fira Code' with a fallback to standard monospaced fonts `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/programiz.css#L4-L4" min=4  file-path="programiz.css">Hii</FileRef>`.
- **Syntax Highlighting:**
- `cm-keyword`: `#CDA869` (Gold/Tan) `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/programiz.css#L43-L45" min=43 max=45 file-path="programiz.css">Hii</FileRef>`.
- `cm-builtin`: `#dcdcaa` (Light Yellow) `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/programiz.css#L53-L55" min=53 max=55 file-path="programiz.css">Hii</FileRef>`.
- `cm-string`: `#8F9D6A` (Sage Green) `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/programiz.css#L58-L60" min=58 max=60 file-path="programiz.css">Hii</FileRef>`.
- `cm-comment`: `#57a64a` (Grass Green) `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/programiz.css#L72-L75" min=72 max=75 file-path="programiz.css">Hii</FileRef>`.

### Implementation Logic

The theme is applied by adding the `.cm-s-programiz` class to the CodeMirror instance. The CSS targets specific CodeMirror internal tokens (e.g., `.cm-atom`, `.cm-def`, `.cm-meta`) to provide a high-contrast Python editing experience.

**Diagram: Theme Application Flow**

```
"CodeMirror Instance"
"CSS Variables (:root)"
"ideState.setTheme()"
"Settings UI (Alpine.js)"
"CodeMirror Instance"
"CSS Variables (:root)"
"ideState.setTheme()"
"Settings UI (Alpine.js)"
User selects "Programiz"
Set --bg:
Set --hil:
editor.setOption('theme', 'programiz')
Apply .cm-s-programiz styles
```

**Sources:**`<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/programiz.css#L1-L136" min=1 max=136 file-path="programiz.css">Hii</FileRef>`, `<FileRef file-url="https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L146-L168" min=146 max=168 file-path="index.js">Hii</FileRef>`
