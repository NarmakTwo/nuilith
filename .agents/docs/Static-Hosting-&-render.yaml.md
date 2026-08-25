# Static Hosting & render.yaml
Relevant source files
- [README.md](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1)
- [render.yaml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml)
- [sitemap.xml](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sitemap.xml)

This page details the deployment configuration and infrastructure requirements for hosting Nuilith as a static application. Because the IDE operates entirely within the browser using WebAssembly (Pyodide), it requires specific security headers to enable advanced synchronization primitives like `SharedArrayBuffer`.

## Render Deployment Configuration

Nuilith is optimized for deployment on **Render** as a static site. The configuration is defined in `render.yaml`, which specifies a zero-build environment where the root directory is served directly.
ParameterValueDescription`type``web`Defines the service type. [render.yaml2](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L2-L2)`env``static`Specifies a static site environment (no backend runtime). [render.yaml4](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L4-L4)`buildCommand``echo 'No build required'`Nuilith is a pure HTML/JS/CSS project and requires no compilation step. [render.yaml5](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L5-L5)`staticPublishPath``.`Serves files from the repository root. [render.yaml6](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L6-L6)
### Deployment Architecture

The following diagram illustrates how the static assets defined in the repository are served to the client browser.

**Static Asset Delivery Flow**

```
Client Browser

Render Infrastructure

GitHub Repository

Configures

Deployed to

Deployed to

Deployed to

Deployed to

HTTPS GET

Spawns

Registers

index.html

js/index.js

js/worker.js

js/sw.js

render.yaml

Static Site Host

Main Thread

Web Worker (Pyodide)

Service Worker
```

Sources: [render.yaml1-7](https://github.com/NarmakTwo/nuilith/blob/9fa46400/render.yaml#L1-L7)[README.md42-49](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L42-L49)

## One-Click Deployment Buttons

To simplify the deployment process for contributors and users, the project includes pre-configured deployment links for major static hosting providers. These links utilize the provider's "Deploy to..." APIs to clone the repository and set up the environment automatically.

- **Vercel**: Uses the `vercel.com/new/clone` endpoint. [README.md22-24](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L22-L24)
- **Netlify**: Uses the `app.netlify.com/start/deploy` endpoint. [README.md25-27](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L25-L27)
- **Render**: Uses the `render.com/deploy` endpoint, which automatically detects the `render.yaml` file. [README.md28-30](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L28-L30)

Sources: [README.md21-31](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L21-L31)

## Cross-Origin Isolation (COI) Requirements

A critical requirement for Nuilith's [synchronous input() execution model](/NarmakTwo/nuilith/3.1-xhr-intercept-lifecycle) is **Cross-Origin Isolation**. This is necessary to unlock `SharedArrayBuffer` and high-resolution timers required for the Web Worker to block during an `input()` call. [README.md54-63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L63)

### Required Security Headers

For the IDE to function correctly in a hosted environment, the following HTTP headers must be present:

1. `Cross-Origin-Opener-Policy: same-origin` (COOP)
2. `Cross-Origin-Embedder-Policy: require-corp` (COEP)

### The `coi-serviceworker` Shim

Since many static hosts do not allow custom header configuration on free tiers, Nuilith includes `coi-serviceworker.min.js`. This script acts as a shim that:

1. Intercepts the initial page load.
2. Forcefully injects the COOP/COEP headers via a Service Worker proxy.
3. Reloads the page in a secure context that permits `SharedArrayBuffer` usage. [README.md63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L63-L63)

**COI Header Enforcement Logic**

```
Web Worker (worker.js)
coi-serviceworker.min.js
Browser
Web Worker (worker.js)
coi-serviceworker.min.js
Browser
Context is now Cross-Origin Isolated
Success: Required for blocking input()
Load index.html
Register Service Worker with COOP/COEP
Reload Page
Initialize Pyodide
Access SharedArrayBuffer
```

Sources: [README.md54-63](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L54-L63)

## Search Engine Optimization (SEO)

The repository includes standard files to manage search engine crawling and indexing for the hosted instance.

- **sitemap.xml**: Points to the primary deployment URL (`https://nuilith.pages.dev/`) and sets the change frequency to weekly. [sitemap.xml10-14](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sitemap.xml#L10-L14)
- **Local Development**: For local testing, users are encouraged to use `npx serve .` to bypass CORS limitations and ensure the Service Worker can register on `localhost:3000`. [README.md88-96](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L88-L96)

Sources: [sitemap.xml1-17](https://github.com/NarmakTwo/nuilith/blob/9fa46400/sitemap.xml#L1-L17)[README.md88-96](https://github.com/NarmakTwo/nuilith/blob/9fa46400/README.md?plain=1#L88-L96)
