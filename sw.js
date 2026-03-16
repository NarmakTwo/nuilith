/**
 * Nuilith Service Worker
 * Handlers: Offline Cache + Synchronous Input Bridge
 */

const CACHE_NAME = 'nuilith-cache-v6';

// --- Local assets ---
const LOCAL_ASSETS = [
    './',
    './index.html',
    './index.js',
    './worker.js',
    './style.css',
    './programiz.css',
    './manifest.json',
    './coi-serviceworker.min.js',
    './assets/icon.png'
];

// --- External CDN dependencies ---
const CDN_ASSETS = [
    // DaisyUI + Tailwind
    'https://cdn.jsdelivr.net/npm/daisyui@5',
    'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',

    // CodeMirror core
    'https://unpkg.com/codemirror@5.65.21/lib/codemirror.js',
    'https://unpkg.com/codemirror@5.65.21/lib/codemirror.css',
    'https://unpkg.com/codemirror@5.65.21/mode/python/python.js',

    // CodeMirror themes
    'https://unpkg.com/codemirror@5.65.21/theme/nord.css',
    'https://unpkg.com/codemirror@5.65.21/theme/rubyblue.css',
    'https://unpkg.com/codemirror@5.65.21/theme/vibrant-ink.css',

    // CodeMirror addons
    'https://unpkg.com/codemirror@5.65.21/addon/comment/comment.js',
    'https://unpkg.com/codemirror@5.65.21/addon/search/search.js',
    'https://unpkg.com/codemirror@5.65.21/addon/search/searchcursor.js',
    'https://unpkg.com/codemirror@5.65.21/addon/search/jump-to-line.js',
    'https://unpkg.com/codemirror@5.65.21/addon/dialog/dialog.js',
    'https://unpkg.com/codemirror@5.65.21/addon/dialog/dialog.css',
    'https://unpkg.com/codemirror@5.65.21/addon/edit/closebrackets.js',
    'https://unpkg.com/codemirror@5.65.21/addon/fold/foldgutter.js',
    'https://unpkg.com/codemirror@5.65.21/addon/fold/foldgutter.css',
    'https://unpkg.com/codemirror@5.65.21/addon/fold/indent-fold.js',
    'https://unpkg.com/codemirror@5.65.21/addon/lint/lint.js',
    'https://unpkg.com/codemirror@5.65.21/addon/lint/lint.css',
    'https://unpkg.com/codemirror@5.65.21/addon/hint/show-hint.js',
    'https://unpkg.com/codemirror@5.65.21/addon/hint/show-hint.css',

    // CodeMirror keymaps
    'https://unpkg.com/codemirror@5.65.21/keymap/vim.js',
    'https://unpkg.com/codemirror@5.65.21/keymap/emacs.js',

    // Alpine.js
    'https://unpkg.com/alpinejs',

    // jQuery + jQuery Terminal
    'https://unpkg.com/jquery@4.0.0/dist/jquery.js',
    'https://unpkg.com/jquery.terminal@2.45.2/css/jquery.terminal.css',
    'https://unpkg.com/jquery.terminal@2.45.2/js/jquery.terminal.js',
    'https://unpkg.com/jquery.terminal@2.45.2/js/echo_newline.js',
    'https://unpkg.com/jquery.terminal@2.45.2/js/unix_formatting.js',

    // Polyfills & utils
    'https://unpkg.com/js-polyfills/keyboard.js',
    'https://cdn.jsdelivr.net/gh/jcubic/static/js/wcwidth.js',

    // Pyodide (core JS loader only — the WASM is loaded by pyodide itself)
    'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js'
];

const ALL_ASSETS = [...LOCAL_ASSETS, ...CDN_ASSETS];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Cache local assets first (fast, reliable)
            await cache.addAll(LOCAL_ASSETS);

            // Cache CDN assets individually so one failure doesn't block all
            const cdnResults = await Promise.allSettled(
                CDN_ASSETS.map(url =>
                    fetch(url, { mode: 'cors' })
                        .then(response => {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                            console.warn(`[SW] Failed to cache (HTTP ${response.status}): ${url}`);
                        })
                        .catch(err => {
                            console.warn(`[SW] Failed to fetch for cache: ${url}`, err.message);
                        })
                )
            );

            const cached = cdnResults.filter(r => r.status === 'fulfilled').length;
            console.log(`[SW] Cached ${cached}/${CDN_ASSETS.length} CDN assets`);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // --- THE INPUT TRAP ---
    if (url.pathname.includes('/get_input')) {
        event.respondWith(
            new Promise((resolve) => {
                const channel = new MessageChannel();
                
                channel.port1.onmessage = (msg) => {
                    resolve(new Response(String(msg.data ?? ''), {
                        status: 200,
                        headers: { 'Content-Type': 'text/plain' }
                    }));
                };

                self.clients.matchAll().then((clients) => {
                    // Must post to the WINDOW (page), not the worker - only the page has term.read()
                    const client = clients.find(c => c.type === 'window') || clients[0];
                    if (client) {
                        client.postMessage({ type: 'INPUT_REQUEST' }, [channel.port2]);
                    } else {
                        resolve(new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } }));
                    }
                });
            })
        );
        return;
    }

    // --- STALE-WHILE-REVALIDATE for everything else ---
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {});

                return cachedResponse || fetchPromise;
            });
        })
    );
});