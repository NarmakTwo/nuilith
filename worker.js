/**
 * Nuilith Worker - Python Engine
 */
importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js");

let pyodide = null;

// Helper to send messages to UI without DataCloneErrors
function postToUI(type, text) {
    self.postMessage({ type: type, text: String(text) });
}

async function initPython() {
    pyodide = await loadPyodide();
    await pyodide.loadPackage("micropip");
    postToUI("READY", "Python Runtime Ready");
}

self.onmessage = async (event) => {
    const { type, code, id } = event.data;

    if (type === "LINT") {
        if (!pyodide) return;
        try {
            self.__lint_code__ = code;
            await pyodide.runPythonAsync(`
import json
import micropip
try:
    import pyflakes
except ImportError:
    micropip.install('pyflakes')
    import pyflakes

from pyflakes.api import check
from pyflakes.reporter import Reporter
import io

class LintReporter(Reporter):
    def __init__(self):
        Reporter.__init__(self, io.StringIO(), io.StringIO())
        self.errors = []
    def unexpectedError(self, filename, msg):
        self.errors.append({"line": 0, "ch": 0, "message": msg, "severity": "error"})
    def syntaxError(self, filename, msg, lineno, offset, text):
        self.errors.append({
            "line": max((lineno or 1) - 1, 0),
            "ch": max(offset or 0, 0),
            "message": msg,
            "severity": "error"
        })
    def flake(self, message):
        self.errors.append({
            "line": message.lineno - 1,
            "ch": message.col,
            "message": str(message).split(": ", 3)[-1] if ":" in str(message) else str(message),
            "severity": "warning"
        })

r = LintReporter()
from js import __lint_code__
code_str = __lint_code__.to_py()
check(code_str, "main.py", r)
            `);
            const result = await pyodide.runPythonAsync("json.dumps(r.errors)");
            const annotations = JSON.parse(result.toString());
            const formatted = annotations.map(a => ({
                from: { line: a.line, ch: a.ch },
                to: { line: a.line, ch: Math.max(a.ch + 1, 0) },
                message: a.message,
                severity: a.severity || "warning"
            }));
            if (!formatted.toString().includes("micropip") && !formatted.toString().includes("pyflakes")) {
                self.postMessage({ type: "LINT_RESULT", id, annotations: formatted });
            }
        } catch (err) {
            if (!formatted.toString().includes("micropip") && !formatted.toString().includes("pyflakes")) {
                self.postMessage({ type: "LINT_RESULT", id, annotations: [{ from: { line: 0, ch: 0 }, to: { line: 0, ch: 1 }, message: String(err.message), severity: "error" }] });
            }
        }
        return;
    }

    // --- MICROPIP INSTALL HANDLER ---
    if (type === "INSTALL") {
        const pkg = event.data.package;
        const isSilent = event.data.isSilent || false;
        if (!pyodide) {
            self.postMessage({ type: "INSTALL_ERROR", package: pkg, error: "Python runtime not ready yet.", isSilent });
            return;
        }
        try {
            // Handle both string and array
            const packagesToInstall = Array.isArray(pkg) ? pkg : [pkg];
            // Skip if empty array
            if (packagesToInstall.length === 0) return;

            self.__packages_to_install__ = packagesToInstall;
            await pyodide.runPythonAsync(`
import micropip
from js import __packages_to_install__
pkgs = __packages_to_install__.to_py()
await micropip.install(pkgs)
            `);
            // Get updated list of installed packages
            const listResult = await pyodide.runPythonAsync(`
import micropip, json
# Filter out internal/helper packages if desired, or just return all
all_pkgs = sorted([str(p) for p in micropip.list()])
json.dumps(all_pkgs)
            `);
            const packages = JSON.parse(listResult.toString());
            self.postMessage({ 
                type: "INSTALL_SUCCESS", 
                package: Array.isArray(pkg) ? pkg.join(', ') : pkg, 
                installedPackages: packages,
                isSilent
            });
        } catch (err) {
            self.postMessage({ 
                type: "INSTALL_ERROR", 
                package: Array.isArray(pkg) ? pkg.join(', ') : pkg, 
                error: String(err.message),
                isSilent
            });
        }
        return;
    }

    // --- LIST PACKAGES HANDLER ---
    if (type === "LIST_PACKAGES") {
        if (!pyodide) {
            self.postMessage({ type: "PACKAGE_LIST", installedPackages: [] });
            return;
        }
        try {
            const listResult = await pyodide.runPythonAsync(`
import micropip, json
json.dumps(sorted([str(p) for p in micropip.list()]))
            `);
            const packages = JSON.parse(listResult.toString());
            self.postMessage({ type: "PACKAGE_LIST", installedPackages: packages });
        } catch (err) {
            self.postMessage({ type: "PACKAGE_LIST", installedPackages: [] });
        }
        return;
    }

    if (type === "RUN") {
        if (!pyodide) return;

        // Setup the Sync Input Bridge
        // We use the 'postToUI' JS function defined above to avoid DataCloneError
        await pyodide.runPythonAsync(`
import builtins
from js import XMLHttpRequest, postToUI

def sync_input(prompt=""):
    if prompt:
        postToUI("PRINT", str(prompt))
    
    request = XMLHttpRequest.new()
    request.open("GET", "/get_input?t=" + str(builtins.id(request)), False)
    try:
        request.send(None)
        return str(request.responseText)
    except Exception as e:
        return ""

builtins.input = sync_input
        `);

        // Redirect stdout/stderr using streaming writes with proper byte handling
        const decoder = new TextDecoder("utf-8");
        pyodide.setStdout({
            write: (buffer) => {
                try {
                    const text = decoder.decode(buffer);
                    postToUI("PRINT", text);
                } catch (e) {
                    postToUI("ERROR", "stdout decode error: " + e.message);
                    return 0;
                }
                return buffer.length;
            }
        });
        pyodide.setStderr({
            write: (buffer) => {
                try {
                    const text = decoder.decode(buffer);
                    postToUI("ERROR", text);
                } catch (e) {
                    postToUI("ERROR", "stderr decode error: " + e.message);
                    return 0;
                }
                return buffer.length;
            }
        });

        try {
            await pyodide.runPythonAsync(code);
            postToUI("FINISHED", "");
        } catch (err) {
            postToUI("ERROR", err.message);
        }
    }
};

initPython();
