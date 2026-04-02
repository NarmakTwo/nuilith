# Nuilith AI Agent Protocol

This document serves as the primary context and behavioral guide for all AI agents working on the Nuilith Python IDE project. It must be consulted at the beginning of every session and updated whenever significant changes are made to the codebase or architecture.

## Project Fundamentals

Nuilith is a static, browser-based Python development environment. It follows a zero-cost infrastructure model, hosting only static assets on Render or Vercel. 

### Core Technology Stack
- **Runtime**: Pyodide (CPython compiled to WebAssembly) running in a Web Worker.
- **UI State**: Alpine.js for reactive data binding.
- **Editor**: Monaco Editor (currently migrating from CodeMirror 5).
- **Terminal**: jQuery Terminal for interactive output and REPL.
- **Persistence**: IndexedDB via a virtual project filesystem.
- **Styling**: Tailwind CSS (via daisyUI and HyperUI CDNs).

## System Architecture

The application is strictly decoupled across three layers:

1. **Main Thread (`index.js`)**: Orchestrates the UI, editor state, and user interactions.
2. **Web Worker (`worker.js`)**: Executes Python code in an isolated WASM environment to prevent UI blocking.
3. **Service Worker (`sw.js`)**: Handles offline caching and intercepts synchronous `XMLHttpRequest` calls to enable blocking `input()` calls in the worker.

## Bot Behavioral Protocol

All AI agents must adhere to the following rules:

### 1. Documentation Maintenance
- Always verify the current state of the project by checking this file and the `.agents/docs/` directory.
- **Ongoing Updates**: Update and fact-check documentation in all appropriate files whenever major features or architectural shifts occur.
- **New Documentation**: Create new documentation files in the `.agents/docs/` directory for larger features or significant architectural changes to maintain a detailed knowledge base.
- **Accuracy**: Ensure that technical deep-dives in the `docs` folder remain accurate to the current codebase.

### 2. Implementation Style
- **Code Commenting**: Thoroughly and constantly comment all code changes. Explain the "why" behind complex logic, especially for worker communication and synchronization.
- **Framework Agnostic**: Stick to vanilla JavaScript and Alpine.js. Avoid adding heavy dependencies or backend-specific code.
- **Minimalist Styling**: Use daisyUI and HyperUI CDN components for Tailwind-based UI.

### 3. Communication Tone
- Maintain a professional and human-like tone.
- **NEVER use emojis.**
- **NEVER use em-dashes (—).** Use colons, commas, or standard hyphens instead.

### 4. Verification and Commitment
- **Browser Testing**: Utilize a browser subagent for testing and verification whenever possible.
- **Commit Protocol**: Only make a commit once both the user and the agent (via automated testing or manual verification) have confirmed that the implementation works as intended.
- **Cleanup**: Remove any temporary files used for verification or runtime before committing. Ensure these files are either deleted after verification or explicitly added to the .gitignore file to prevent project clutter.

## Knowledge Base Referrals

For in-depth technical knowledge, refer to the following documents in `.agents/docs/`:

### Architecture & Runtime
- [Core Architecture](docs/Core-Architecture.md): High-level system design.
- [Web Worker Runtime](docs/Web-Worker---Python-Runtime-(worker.js).md): Details on Pyodide initialization and message handling.
- [Synchronous Input Model](docs/Synchronous-input()-Execution-Model.md): Essential guide to how blocking input() is handled.
- [Service Worker & I/O](docs/Service-Worker---Caching-&-I-O-Bridge-(sw.js).md): Caching and XHR interception logic.

### Data & UI
- [IndexedDB & Persistence](docs/IndexedDB-Storage-Auto-Save.md): Schema and save protocols.
- [Alpine.js State Management](docs/Alpine.js-State-Management.md): The ideState object and reactive UI.
- [Project & File System](docs/Project-&-File-System.md): Virtual workspace management.
- [Themes & Styling](docs/Themes-&-CSS-Styling.md): Custom CSS and daisyUI integration.

### Package & Linting
- [Micropip Package Manager](docs/micropip-Package-Manager.md): Installing dependencies in the worker.
- [Live Linting](docs/Live-Linting-with-Pyflakes.md): Background code analysis using Pyflakes.
