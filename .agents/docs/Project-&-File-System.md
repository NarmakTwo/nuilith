# Project & File System
Relevant source files
- [index.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js)
- [manifest.json](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json)

Nuilith employs a virtual workspace system that enables multi-file Python development entirely within the browser. This system abstracts the underlying IndexedDB storage into a project-based metaphor, allowing users to switch between different workspaces, manage multiple files per project, and bundle their work into a portable `.nu` format.

### Virtual Workspace Overview

The workspace is managed by the `ideState` Alpine.js object, which tracks the `currentProject`[index.js168](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L168-L168) the list of available projects (`projectsList`) [index.js169](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L169-L169) and the files within the active project (`files`) [index.js180](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L180-L180)

#### Workspace-to-Code Mapping

The following diagram illustrates how the conceptual "Project" relates to the internal state and storage entities.

**Diagram: Workspace Entity Mapping**

```
Storage Layer (IndexedDB)

Code Entity Space (Main Thread)

Natural Language Space

'Project' (User Workspace)

'File' (Python Script)

ideState (Alpine.js)

ideState.activeFile

ideState.projectsList

ideState.currentProject

nuilithdb

'projects' Object Store
```

Sources: [index.js14-16](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L14-L16)[index.js167-183](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L167-L183)

---

### Multi-Project Support

Nuilith supports multiple independent projects. When a user switches projects via `switchProject(name)`, the IDE performs a context swap:

1. **State Persistence**: The current project's metadata and file list are synchronized to IndexedDB [index.js463-475](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L463-L475)
2. **Runtime Reset**: The Python worker is notified of the change, and packages associated with the new project are re-installed silently [index.js58-66](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L58-L66)
3. **UI Update**: The file list and editor content are refreshed to reflect the new project's state [index.js469-472](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L469-L472)

Projects are stored in the `projects` object store within the `nuilithdb` IndexedDB instance [index.js14-16](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L14-L16) Each entry in the store contains the project name, a list of file objects (name and content), and associated metadata like installed packages.

For details on the database schema and persistence logic, see [IndexedDB Storage & Auto-Save](/NarmakTwo/nuilith/4.1-indexeddb-storage-and-auto-save).

Sources: [index.js14-16](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L14-L16)[index.js58-66](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L58-L66)[index.js463-475](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L463-L475)

---

### File Management

The file system is flat within each project. Users can create, rename, and delete files through the UI, which triggers updates to the `ideState.files` array.

Create: `createNewFile()` opens a name prompt. Rename: `finishRename()` (also retargets `entryScript`). Duplicate: `duplicateFile()`. Delete: tab X uses `deleteFile()` (confirms); context-menu Delete uses `deleteFileImmediate()` (no confirm). Drag tabs to reorder. Switch: `switchFile()`. Entry: right-click a tab for `setEntryScript` / `unsetEntryScript`. One entry per project. Run uses that file, or the open tab if unset.

---

### The .nu and .zip Export Formats

To facilitate portability, Nuilith exports JSZip archives:

1. **`.nu`**: `manifest.json` at the zip root (`packages`, `entryScript`) plus all `.py` files.
2. **`.zip`**: the same files, with the manifest at `.nuilith/manifest.json`.

The IDE also integrates with the browser's File System Access API via the `launchQueue` to handle opening `.nu`, `.zip`, and `.py` files directly from the operating system.

**Diagram: Export/Import Pipeline**

```
OS Integration

Export Pipeline (JSZip)

Internal State

ideState.files

ideState.installedPackages

manifest.json

*.py files

Project.nu (ZIP)

manifest.json (PWA)

file_handlers
```

Sources: [index.js685-703](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L685-L703)[manifest.json26-34](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L26-L34)

For details on the bundling process and collision resolution during import, see [Import/Export & the .nu Format](/NarmakTwo/nuilith/4.2-importexport-and-the-.nu-format).

---

### Related Pages

- **[IndexedDB Storage & Auto-Save](/NarmakTwo/nuilith/4.1-indexeddb-storage-and-auto-save)**: Deep dive into the `nuilithdb` schema, the migration from legacy single-file storage, and the 30-second `autosaveTime` protocol.
- **[Import/Export & the .nu Format](/NarmakTwo/nuilith/4.2-importexport-and-the-.nu-format)**: Technical specifications of the `.nu` bundle and the implementation of the PWA `file_handlers`.
