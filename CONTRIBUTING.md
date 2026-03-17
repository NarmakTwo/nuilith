# Contributing to Nuilith

First off, thank you for considering contributing to Nuilith! It's people like you that make Nuilith a great tool for everyone.

## How Can I Contribute?

### Reporting Bugs
Before creating bug reports, please check the [existing issues](https://github.com/NarmakTwo/python-ide/issues) to see if the problem has already been reported.

When you are creating a bug report, please include as many details as possible:
* **Use a clear and descriptive title.**
* **Describe the exact steps to reproduce the problem.**
* **Explain which behavior you expected to see and why.**
* **Include screenshots** if helpful.

### Suggesting Enhancements
Enhancement suggestions are tracked as [GitHub issues](https://github.com/NarmakTwo/python-ide/issues).
* **Use a clear and descriptive title.**
* **Provide a step-by-step description of the suggested enhancement.**
* **Explain why this enhancement would be useful** to most Nuilith users.

### Your First Code Contribution
Unsure where to begin contributing? You can start by looking through these issues:
* **Good First Issues:** Issues that have a very limited scope and are a great way to get started.
* **Help Wanted Issues:** Issues that might be a bit more involved but are definitely needed.

## Local Development Setup

Nuilith is a static web application. You don't need a complex backend setup to get started.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NarmakTwo/python-ide
   cd python-ide
   ```

2. **Run a local server:**
   Since Nuilith uses Service Workers, it must be served over `http://localhost` or `https`. You can use any static server.
   ```bash
   # Using npx
   npx serve .
   
   # Using Python
   python -m http.server 8000
   ```

3. **Open in Browser:**
   Navigate to `http://localhost:3000` (for `serve`) or `http://localhost:8000` (for Python).

## Pull Request Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the UI still looks great (responsive, consistent theme).
4. Update the documentation (like this README) if you're adding new features.
5. Submit a pull request!

## Roadmap Projects
We are looking for help with several major features:
* **Jupyter Notebook Functionality**: Bringing a notebook-style interface to Nuilith.
* **Matplotlib Integration**: Enabling data visualization in the browser.
* **Modular UI**: Refactoring the UI to be more extensible and user-customizable.
* **Multi-language Support**: Integrating runtimes for Node.js, C/C++, Ruby, Go, and Lua (via WASM).
* **Backend & Hosting**: Building a light backend for persistence and better collaboration features.
* **Enhanced Sidebar**: Adding a sidebar for file selection, extensions, and workspace management.

---

By contributing, you agree that your contributions will be licensed under its [MIT License](LICENSE).
