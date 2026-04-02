# IndexedDB Storage & Auto-Save
Relevant source files
- [README.md](https://github.com/NarmakTwo/python-ide/blob/9fa46400/README.md?plain=1)
- [index.js](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js)
- [render.yaml](https://github.com/NarmakTwo/python-ide/blob/9fa46400/render.yaml)

This page details the persistence layer of the Nuilith IDE. Nuilith utilizes a virtual workspace system backed by the browser's IndexedDB API to manage multi-project environments, file contents, and application state without a backend server.

## NuilithDB Schema

The IDE uses a single IndexedDB database named `nuilithdb`[index.js14](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L14-L14) The schema is versioned (currently version 3) [index.js15](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L15-L15) to handle migrations from legacy single-project storage to the current multi-project architecture.

### The `projects` Object Store

The primary storage unit is the `projects` object store [index.js16](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L16-L16) Each entry in this store represents a self-contained workspace.
FieldTypeDescription`id``String`Unique identifier (Project Name). Key path for the store.`files``Array<Object>`List of file objects: `{ name: String, content: String }`.`activeFile``String`The filename currently open in the editor.`packages``Array<String>`List of PyPI packages installed via `micropip`.`lastModified``Number`Timestamp of the last save operation.
### Database Initialization Flow

When the IDE loads, it initializes the connection via `initDB()`[index.js241-274](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L241-L274) This function handles the creation of the object store and executes version-specific migrations.

**Entity Mapping: Database Lifecycle**

```
IndexedDB (nuilithdb)

Main Thread (index.js)

New Install

Version < 3

initDB()

Check Version

createObjectStore('projects')

Migration Logic

openFilesDB

loadProject()

Store: projects
```

Sources: [index.js14-17](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L14-L17)[index.js241-274](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L241-L274)

## Legacy-to-Multi-Project Migration

Prior to version 3, Nuilith stored files in a simpler schema or relied heavily on `localStorage`. The `onupgradeneeded` handler in `initDB` manages the transition to the multi-project system [index.js246-263](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L246-L263)

1. **Store Creation**: If the `projects` store does not exist, it is created with `id` as the key path [index.js254-255](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L254-L255)
2. **Legacy Data Recovery**: The system attempts to migrate data from the old `files` store (if present) into a project named "default" within the new `projects` store [index.js257-261](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L257-L261)
3. **State Synchronization**: After migration, the UI state is updated to reflect the "default" project as the active workspace [index.js269](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L269-L269)

Sources: [index.js241-274](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L241-L274)

## 30-Second Auto-Save Protocol

Nuilith implements a non-blocking auto-save mechanism to ensure data persistence against browser crashes or accidental refreshes.

### Trigger Mechanism

The auto-save is governed by a global timestamp `globalThis.autosaveTime`[index.js8](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L8-L8)

- **Periodic Check**: The `checkAutosave()` function runs frequently. If more than 30 seconds have elapsed since the last save, it triggers `saveProject()`[index.js295-300](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L295-L300)
- **Immediate Save**: Certain actions, such as clicking the "Run" button, trigger an immediate save to ensure the Python worker executes the latest buffer [index.js462](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L462-L462)

### Serialization Process

The `saveProject()` function performs the following steps [index.js276-293](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L276-L293):

1. **Buffer Capture**: It retrieves the current text from the CodeMirror instance (`myCodeMirror.getValue()`) [index.js278](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L278-L278)
2. **State Assembly**: It updates the `files` array in the Alpine.js `ideState` to ensure the `activeFile` contains the latest buffer [index.js279-281](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L279-L281)
3. **IndexedDB Transaction**: It opens a `readwrite` transaction on the `projects` store and `put`s the entire project object (including files and installed packages) into the database [index.js283-291](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L283-L291)

**Data Flow: Auto-Save Cycle**

```
IndexedDB (projects)
ideState (Alpine.js)
checkAutosave()
CodeMirror Editor
IndexedDB (projects)
ideState (Alpine.js)
checkAutosave()
CodeMirror Editor
Every 30s or on 'Run'
Update globalThis.autosaveTime
getValue()
Current Code Buffer
Update files[activeFile].content
put({ id: currentProject, files, packages })
Success
```

Sources: [index.js8](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L8-L8)[index.js276-300](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L276-L300)[index.js462](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L462-L462)

## Project Restoration

When a project is loaded (either at startup or via the project switcher), the `loadProject(projectName)` function handles the restoration of the environment [index.js302-340](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L302-L340)

### Restoration Steps

1. **Database Fetch**: Retrieves the project object from the `projects` store using the `projectName` key [index.js306-309](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L306-L309)
2. **State Hydration**:

- Updates `ideState.files` and `ideState.activeFile`[index.js314-315](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L314-L315)
- Restores the list of `installedPackages`[index.js316](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L316-L316)
3. **Editor Refresh**: Calls `myCodeMirror.setValue()` with the content of the active file [index.js319-322](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L319-L322)
4. **Worker Synchronization**: If the project has saved packages, it sends an `INSTALL` message to the `worker.js` with the `isSilent: true` flag to re-prepare the Python environment without UI toast interruptions [index.js324-328](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L324-L328)

### Default Project Fallback

If no project is found (e.g., first run), the system initializes a "default" project containing a standard `main.py` with a "Hello World" template [index.js330-338](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L330-L338)

Sources: [index.js302-340](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L302-L340)[index.js58-67](https://github.com/NarmakTwo/python-ide/blob/9fa46400/index.js#L58-L67)
