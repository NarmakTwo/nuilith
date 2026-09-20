# Import/Export & the .nu Format
Relevant source files
- [demos/mandelbrot.nu](https://github.com/NarmakTwo/nuilith/blob/9fa46400/demos/mandelbrot.nu)
- [index.js](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js)
- [manifest.json](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json)

This section documents the project serialization and portability layer of Nuilith. It covers the technical specifications of the `.nu` project bundle, the logic for handling file collisions during imports, and the integration with the Progressive Web App (PWA) File System Access API for native file handling.

## The .nu Project Bundle Format

The `.nu` format is a specialized project archive designed for portability across different Nuilith instances. Technically, a `.nu` file is a standard **JSZip** archive containing the project's source files and a metadata manifest.

### Archive Structure

A standard `.nu` bundle contains:

1. **Project Files**: All files belonging to the project (e.g., `main.py`, `utils.py`) stored at the root of the ZIP.
2. **`manifest.json`**: A metadata file containing project-level settings.

FieldTypeDescription`packages`ArrayList of PyPI packages required by the project.`entryScript`String or nullFilename the Run button executes. `null` or omitted means Run uses the currently open file.

A `.zip` export is the same archive except `manifest.json` lives at `.nuilith/manifest.json` instead of the zip root. Import accepts both `.nu` and `.zip` and reads whichever manifest path is present (`.nuilith/manifest.json` wins if both exist). After import, `switchProject` restores declared `packages` into the worker the same way Run and READY do.

---

## Export Pipeline

The export process serializes the current state of the IDE's virtual file system (IndexedDB) into a downloadable blob. `exportProject()` writes a `.nu` bundle. `exportProjectZip()` writes the same files as `.zip` with the manifest under `.nuilith/`.

### Data Flow: Export

1. **State Gathering**: The system retrieves the current `files` array, `installedPackages`, and `entryScript` from the reactive state.
2. **Manifest Generation**: `buildProjectManifest()` emits `{ packages, entryScript }`.
3. **Compression**: `JSZip` adds each file plus the manifest (`manifest.json` or `.nuilith/manifest.json`).
4. **Blob Trigger**: The archive is generated as a `blob` and downloaded with the `.nu` or `.zip` extension.

```
Main Thread (index.js)

ideState.exportProject()

Create JSZip Instance

Add manifest.json

Iterate ideState.files

zip.file(filename, content)

zip.generateAsync({type: 'blob'})

Trigger Browser Download (.nu)
```

**Sources:**[index.js1396-1433](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1396-L1433)

---

## Import Pipeline & Collision Resolution

The import pipeline supports single `.py` files, `.nu` project bundles, and `.zip` bundles. When a user imports a file, Nuilith must reconcile the incoming data with the existing project in the `projects` object store of `nuilithdb`.

### Import Logic (`processFileHandle`)

- **Single `.py`**: The file is read and appended to the `files` array of the current project.
- **`.nu` or `.zip` Bundle**:

1. The ZIP is decompressed using `JSZip`.
2. `readBundleManifest()` parses `.nuilith/manifest.json` or root `manifest.json`.
3. `.py` files are loaded (metadata under `.nuilith/` is skipped). `entryScript` is restored if that filename exists.
4. **Collision Check**: The system checks if a project with the same name already exists in IndexedDB.
5. **Resolution**: If a collision occurs, the IDE prompts the user to either overwrite the existing project or cancel the import.

### Collision Resolution Flow

```
IndexedDB (nuilithdb)
ideState.importProject()
User
IndexedDB (nuilithdb)
ideState.importProject()
User
alt
[Project Exists]
[New Project]
Uploads .nu file
JSZip.loadAsync(file)
Parse manifest.json
Check if projectName exists
Collision Found
Show Modal (Overwrite?)
Confirms Overwrite
put(projectData)
add(projectData)
switchProject(newName)
```

**Sources:**[index.js1435-1498](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1435-L1498)[index.js16-17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L16-L17)

---

## PWA File Handler Integration

Nuilith implements the **PWA File Handling API**, allowing it to register as a system-level handler for `.py` and `.nu` files. This is configured in the Web App Manifest and consumed during the application bootstrap.

### Manifest Configuration

The `manifest.json` defines the `file_handlers` array, mapping file extensions to the root action URL.

```
"file_handlers": [
    {
        "action": "/",
        "accept": {
            "text/x-python": [".py"],
            "application/zip": [".nu"]
        }
    }
]
```

**Sources:**[manifest.json26-34](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L26-L34)

### Launch Queue Consumer

Upon initialization, `index.js` checks the `window.launchQueue`. If the app was launched by opening a file from the operating system, the `FileSystemFileHandle` is processed.

1. **Consumer Setup**: `launchQueue.setConsumer()` is called.
2. **Handle Extraction**: The system retrieves the `FileSystemFileHandle` from the launch params.
3. **File Reading**: The `getFile()` method is called on the handle to obtain a `File` object.
4. **Route to Import**: The `File` object is passed directly to the `importProject` logic, treating it exactly like a manual upload.

**Sources:**[index.js1500-1520](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1500-L1520)

---

## Technical Summary Table
FeatureImplementation DetailCode Entity**Serialization**JSZip (v3.10.1)`JSZip`[index.js1401](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1401-L1401)**Project Storage**IndexedDB Store: `projects``PROJECTS_STORE`[index.js16](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L16-L16)**File Detection**PWA Launch Queue API`window.launchQueue`[index.js1500](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1500-L1500)**Extension**`.nu` (MIME: `application/zip`)`manifest.json:31]()**Package Sync**Metadata field `installedPackages``manifest.json`[index.js1406](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1406-L1406)
**Sources:**[index.js16-17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L16-L17)[index.js1400-1410](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1400-L1410)[index.js1500-1510](https://github.com/NarmakTwo/nuilith/blob/9fa46400/index.js#L1500-L1510)[manifest.json26-34](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L26-L34)
