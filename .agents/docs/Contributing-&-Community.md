# Contributing & Community
Relevant source files
- [.github/ISSUE_TEMPLATE/bug_report.yml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/.github/ISSUE_TEMPLATE/bug_report.yml)
- [.github/ISSUE_TEMPLATE/feature_request.yml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/.github/ISSUE_TEMPLATE/feature_request.yml)
- [CODE_OF_CONDUCT.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CODE_OF_CONDUCT.md?plain=1)
- [CONTRIBUTING.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1)
- [LICENSE](https://github.com/NarmakTwo/nuilith/blob/9fa46400/LICENSE)

This page outlines the standards, processes, and community guidelines for contributing to the Nuilith Python IDE. As an open-source project, Nuilith relies on community contributions to expand its browser-based Python runtime and IDE features.

## Community Standards

Nuilith follows the **Contributor Covenant Code of Conduct** to ensure a welcoming and harassment-free experience for all participants [CODE_OF_CONDUCT.md1-5](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CODE_OF_CONDUCT.md?plain=1#L1-L5) Contributors are expected to use inclusive language, respect differing viewpoints, and focus on what is best for the community [CODE_OF_CONDUCT.md9-15](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CODE_OF_CONDUCT.md?plain=1#L9-L15) Unacceptable behaviors, including harassment or derogatory comments, may result in temporary or permanent repercussions [CODE_OF_CONDUCT.md17-30](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CODE_OF_CONDUCT.md?plain=1#L17-L30)

**Sources:**[CODE_OF_CONDUCT.md1-44](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CODE_OF_CONDUCT.md?plain=1#L1-L44)

## Development Setup & Workflow

Nuilith is a static web application, meaning it does not require a complex backend for local development [CONTRIBUTING.md29-30](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L29-L30) However, because the IDE utilizes **Service Workers** for features like synchronous `input()` interception, it must be served over `http://localhost` or `https` to satisfy browser security requirements [CONTRIBUTING.md37-38](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L37-L38)

### Local Environment Setup
StepActionCommand / Detail1Clone Repository`git clone https://github.com/NarmakTwo/nuilith`[CONTRIBUTING.md31-35](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L31-L35)2Start Server`npx serve .` or `python -m http.server 8000`[CONTRIBUTING.md39-45](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L39-L45)3Access IDE`http://localhost:3000` or `http://localhost:8000`[CONTRIBUTING.md47-49](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L47-L49)
For a detailed step-by-step guide on branching, testing with Service Workers, and PR requirements, see **[Development Workflow](/NarmakTwo/nuilith/8.1-development-workflow)**.

**Sources:**[CONTRIBUTING.md27-57](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L27-L57)

## Issue Reporting & Contributions

The project uses GitHub Issues to track bugs and feature requests. Before opening a new issue, contributors should check for existing reports [CONTRIBUTING.md7-9](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L7-L9)

### Bug Reports

Contributors must provide clear reproduction steps and environment details (Browser/OS) [CONTRIBUTING.md10-15](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L10-L15) The project provides a structured template to ensure all necessary data is captured [.github/ISSUE_TEMPLATE/bug_report.yml1-42](https://github.com/NarmakTwo/nuilith/blob/9fa46400/.github/ISSUE_TEMPLATE/bug_report.yml#L1-L42)

### Feature Requests

Enhancement suggestions should explain the problem being solved and why the proposed solution benefits the majority of users [CONTRIBUTING.md16-21](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L16-L21) A dedicated template is used to collect proposals and considered alternatives [.github/ISSUE_TEMPLATE/feature_request.yml1-33](https://github.com/NarmakTwo/nuilith/blob/9fa46400/.github/ISSUE_TEMPLATE/feature_request.yml#L1-L33)

### Pull Request Process

1. Fork the repository and create a branch from `main`[CONTRIBUTING.md52](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L52-L52)
2. Add tests for new code and ensure UI responsiveness [CONTRIBUTING.md53-54](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L53-L54)
3. Update relevant documentation [CONTRIBUTING.md55](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L55-L55)
4. Submit the PR for review [CONTRIBUTING.md56](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L56-L56)

**Sources:**[CONTRIBUTING.md5-26](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L5-L26)[CONTRIBUTING.md50-57](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L50-L57)[.github/ISSUE_TEMPLATE/bug_report.yml1-42](https://github.com/NarmakTwo/nuilith/blob/9fa46400/.github/ISSUE_TEMPLATE/bug_report.yml#L1-L42)[.github/ISSUE_TEMPLATE/feature_request.yml1-33](https://github.com/NarmakTwo/nuilith/blob/9fa46400/.github/ISSUE_TEMPLATE/feature_request.yml#L1-L33)

## Roadmap & Future Architecture

Nuilith has several high-priority architectural goals aimed at improving the IDE experience and expanding runtime capabilities. Key projects include:

- **Monaco Editor Migration**: Transitioning from CodeMirror to Monaco for a more robust editing experience [CONTRIBUTING.md66](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L66-L66)
- **Jupyter Notebooks**: Implementing a cell-based notebook interface [CONTRIBUTING.md60](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L60-L60)
- **Multi-language Runtimes**: Integrating WASM-based runtimes for Node.js, C/C++, Ruby, Go, and Lua [CONTRIBUTING.md63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L63-L63)
- **Matplotlib Integration**: Enabling browser-side data visualization [CONTRIBUTING.md61](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L61-L61)

For the full list of planned features and technical goals, see **[Roadmap & Future Architecture](/NarmakTwo/nuilith/8.2-roadmap-and-future-architecture)**.

### Contributor Onboarding Map: Feature to Code

The following diagram maps high-level roadmap goals to the specific areas of the codebase they impact.

**Roadmap to Code Entity Mapping**

```
Code Entity Space

Natural Language Space (Roadmap)

Monaco Editor Migration

Jupyter Notebook Interface

Multi-language WASM Runtimes

Modular UI Refactor

index.html (UI Layout)

index.js (ideState / Alpine.js)

worker.js (Pyodide / WASM Logic)

style.css (Themes / Layout)
```

**Sources:**[CONTRIBUTING.md58-67](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L58-L67)

## Licensing

Nuilith is released under the **MIT License**[LICENSE1](https://github.com/NarmakTwo/nuilith/blob/9fa46400/LICENSE#L1-L1) By contributing to the project, you agree that your contributions will be licensed under these same terms [CONTRIBUTING.md70](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L70-L70)

The MIT License allows for:

- **Commercial use**, **Distribution**, **Modification**, and **Private use**[LICENSE5-9](https://github.com/NarmakTwo/nuilith/blob/9fa46400/LICENSE#L5-L9)
- The only requirement is the inclusion of the original copyright notice and permission notice in all copies or substantial portions of the software [LICENSE12-13](https://github.com/NarmakTwo/nuilith/blob/9fa46400/LICENSE#L12-L13)

### Legal Entity Mapping

The following diagram illustrates the relationship between the project's legal standing and its contribution requirements.

**License and Contribution Relationship**

```
Community Space

Legal Space

Submits

Must Adhere To

Agrees To

Protects

MIT License

Copyright (c) 2026 Nuilith Team

Contributor

Pull Request

CONTRIBUTING.md Requirements
```

**Sources:**[LICENSE1-21](https://github.com/NarmakTwo/nuilith/blob/9fa46400/LICENSE#L1-L21)[CONTRIBUTING.md70](https://github.com/NarmakTwo/nuilith/blob/9fa46400/CONTRIBUTING.md?plain=1#L70-L70)
