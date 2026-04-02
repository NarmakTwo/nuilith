# Progressive Web App (PWA) Setup
Relevant source files
- [assets/icon.png](https://github.com/NarmakTwo/python-ide/blob/9fa46400/assets/icon.png)
- [index.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js)
- [manifest.json](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json)

This page documents the technical implementation of Nuilith as a Progressive Web App (PWA). It covers the configuration for offline capabilities, standalone execution, file system integration via the File Handling API, and the installation lifecycle.

## PWA Configuration (manifest.json)

The `manifest.json` file defines the metadata required for the browser to treat the IDE as an installable application. Key fields include the application identity, visual theme, and deep integration with the host operating system's file system.
FieldValuePurpose`display``standalone`Removes browser UI (address bar, tabs) to provide an app-like experience [manifest.json6](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L6-L6)`theme_color``#1c2130`Sets the color of the toolbars and OS task switchers [manifest.json8](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L8-L8)`background_color``#1c2130`Background color displayed while the app is loading [manifest.json9](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L9-L9)`file_handlers`ArrayRegisters Nuilith as a handler for `.py` and `.nu` files [manifest.json26-34](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L26-L34)
### File Handlers

Nuilith registers itself to handle two specific MIME types and extensions:

1. **Python Files (`.py`)**: `text/x-python`[manifest.json30](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L30-L30)
2. **Nuilith Projects (`.nu`)**: `application/zip`[manifest.json31](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L31-L31)

**Sources:**[manifest.json1-35](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L1-L35)

---

## Installation Flow

The installation logic is managed within the `ideState` Alpine.js object in `index.js`. The application listens for the browser's installation prompt and provides a custom UI trigger.

### Installation Lifecycle

1. **Detection**: The browser fires the `beforeinstallprompt` event.
2. **State Capture**: The event is captured and stored in `ideState.deferredPrompt`, and `ideState.canInstall` is set to `true`[index.js146-147](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L146-L147)[index.js255-259](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L255-L259)
3. **User Trigger**: When the user clicks the "Install" button in the UI, the `installPWA()` function is called.
4. **Prompt Execution**: The application calls `.prompt()` on the saved event and resets the state [index.js338-345](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L338-L345)

**Sources:**[index.js146-147](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L146-L147)[index.js255-259](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L255-L259)[index.js338-345](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L338-L345)

---

## File System Integration (launchQueue)

Nuilith utilizes the `launchQueue` API to consume files passed to it by the operating system (e.g., when a user double-clicks a `.py` file). This consumer is initialized during the application startup.

### Implementation Detail

The `launchQueue.setConsumer` callback receives a `launchParams` object containing `files`. For each file handle:

- **Python Files**: The content is read as text and imported as a new file within the current project [index.js267-275](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L267-L275)
- **Nuilith Projects**: The `.nu` file (a JSZip blob) is passed to the `importProject` logic [index.js276-278](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L276-L278)

### Launch Consumer Logic

**Launch Data Flow: OS to Code Entity**

```
Code Entity Space (index.js)

OS Space

.py

.nu

User Double-clicks .py/.nu file

OS launches Nuilith PWA

window.launchQueue.setConsumer

Iterate launchParams.files

File Extension?

file.getFile()

reader.readAsText()

ideState.importFile()

file.getFile()

ideState.importProject(blob)
```

**Sources:**[index.js262-283](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L262-L283)

---

## Icon Assets and Maskables

The PWA requires specific icon assets to ensure high-quality display across different platforms (Android, iOS, Windows, macOS).
Asset PathSizePurpose`/assets/icon.png`192x192General purpose icon [manifest.json12-16](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L12-L16)`/assets/icon.png`512x512High-resolution and Maskable icon for Android [manifest.json18-22](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L18-L22)
The "maskable" purpose allows the OS to crop the icon into different shapes (circle, square, squircle) without losing the core logo [manifest.json21](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L21-L21)

**Sources:**[manifest.json10-23](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L10-L23)[assets/icon.png1-10](https://github.com/NarmakTwo/python-ide/blob/9fa46400/assets/icon.png#L1-L10)

---

## Service Worker and Offline Support

The PWA functionality is underpinned by `sw.js`, which handles asset caching and ensures the IDE remains functional without an internet connection.

### Caching Strategy

The Service Worker caches:

1. **Core UI Assets**: HTML, CSS, and JS (index.js).
2. **Editor Dependencies**: CodeMirror and jQuery Terminal libraries.
3. **Worker Scripts**: `worker.js` and `coi-serviceworker.min.js`.

### PWA Architecture Diagram

This diagram bridges the high-level PWA concepts to the specific files and functions implementing them.

**Nuilith PWA Architecture**

```
Main Thread (index.js)

Browser Environment

Defines

Handles

Calls

Processes

Processes

Provides

manifest.json

sw.js (Service Worker)

ideState (Alpine.js)

launchQueue.setConsumer

beforeinstallprompt

installPWA()

importFile()

importProject()

Offline Cache
```

**Sources:**[index.js136-184](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L136-L184)[index.js255-283](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L255-L283)[manifest.json1-35](https://github.com/NarmakTwo/python-ide/blob/9fa46400/manifest.json#L1-L35)
