# Deployment & PWA Configuration
Relevant source files
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [manifest.json](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)
- [robots.txt](https://github.com/NarmakTwo/nuilith/blob/9fa46400/robots.txt)
- [sitemap.xml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sitemap.xml)

Nuilith is designed as a **static, client-side application**, allowing it to be hosted on any modern web server or static site provider without requiring a dedicated backend. This architecture enables high availability, low latency, and full offline functionality through Progressive Web App (PWA) technologies.

The deployment strategy focuses on maintaining **Cross-Origin Isolation (COI)** to support advanced browser features like `SharedArrayBuffer`, which are critical for the synchronous execution model [README.md54-63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L63)

### Deployment Overview

Nuilith can be deployed to major static hosting providers with zero configuration. The repository includes pre-configured buttons for one-click deployment to **Render**, **Vercel**, and **Netlify**[README.md21-31](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L21-L31) Because the project is purely HTML, JS, and CSS, it requires no build step beyond serving the root directory [render.yaml5-6](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L5-L6)
FeatureImplementation**Hosting Type**Static (no Node.js/Python backend required)**Build Command**None (e.g., `echo 'No build required'`)**Publish Path**Root directory (`.`)**Security Requirements**COOP and COEP headers for Cross-Origin Isolation**Search Discovery**Managed via `sitemap.xml` and `robots.txt`
For detailed hosting configurations and header requirements, see **[Static Hosting & render.yaml](/NarmakTwo/nuilith/7.1-static-hosting-and-render.yaml)**.

### PWA & Offline Capabilities

Nuilith implements a PWA strategy that allows the IDE to be installed as a standalone desktop or mobile application. This is managed through a `manifest.json` file that defines the app's appearance and behavior within the operating system [manifest.json1-35](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L1-L35)

#### System-to-Code Entity Mapping: PWA Integration

The following diagram illustrates how the PWA configuration files bridge the gap between the web browser and the local operating system's application layer.

**PWA Integration Architecture**

```
Application Logic (index.js)

Web Manifest (manifest.json)

Operating System Layer

Triggers

Routes to

Handled by

Launches

Displays in

Local File System (.py, .nu)

OS Application Launcher

'name': 'Nuilith Python IDE'

'display': 'standalone'

'file_handlers'

window.launchQueue

setConsumer()
```

Sources: [manifest.json2-34](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L2-L34)[README.md75-77](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L75-L77)

#### Key PWA Features:

- **Offline Access**: Once initial assets (Pyodide, Pyflakes, and UI libraries) are cached by the Service Worker (`sw.js`), the IDE functions without an internet connection [README.md40-41](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L40-L41)
- **File Handlers**: The IDE registers itself to handle `.py` (Python) and `.nu` (Nuilith Project) files directly from the OS file explorer [manifest.json26-34](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L26-L34)
- **Standalone Mode**: Using the `standalone` display property, Nuilith removes browser chrome (address bar, tabs) to provide an immersive IDE experience [manifest.json6](https://github.com/NarmakTwo/nuilith/blob/9fa46400/manifest.json#L6-L6)

For details on manifest settings and the installation lifecycle, see **[Progressive Web App (PWA) Setup](/NarmakTwo/nuilith/7.2-progressive-web-app-(pwa)-setup)**.

### SEO & Discoverability

To ensure the IDE is correctly indexed by search engines while hosted on platforms like Render, the project includes standard web discovery files:

- **`robots.txt`**: Directs crawlers to the sitemap and allows full indexing of the application [robots.txt1-4](https://github.com/NarmakTwo/nuilith/blob/9fa46400/robots.txt#L1-L4)
- **`sitemap.xml`**: Defines the primary entry point for the application at `https://nuilith.pages.dev/`[sitemap.xml10-14](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sitemap.xml#L10-L14)

**Deployment Entity Mapping**

```
Hosting Environment (Render/Vercel)

Deployment Configuration

Defines 'env: static'

Sets 'staticPublishPath: .'

Informed by

Read by

Served with

render.yaml

sitemap.xml

robots.txt

Static Web Server

COOP/COEP Headers

Search Engine Bots
```

Sources: [render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)[sitemap.xml1-17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sitemap.xml#L1-L17)[robots.txt1-5](https://github.com/NarmakTwo/nuilith/blob/9fa46400/robots.txt#L1-L5)[README.md63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L63-L63)

---

### Child Pages

- **[Static Hosting & render.yaml](/NarmakTwo/nuilith/7.1-static-hosting-and-render.yaml)**: Detailed guide on deploying to various providers and ensuring the environment meets security header requirements.
- **[Progressive Web App (PWA) Setup](/NarmakTwo/nuilith/7.2-progressive-web-app-(pwa)-setup)**: Deep dive into the PWA manifest, icon assets, and the logic for handling file launches from the operating system.
