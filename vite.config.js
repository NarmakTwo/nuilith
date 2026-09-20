import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Local secrets.env (gitignored) plus optional Render/CI env vars.
 * TURN credentials must be inlined into the client bundle because ICE
 * runs in the browser. Never print these values in UI or docs.
 */
function loadSecretsEnv() {
    const file = path.join(rootDir, 'secrets.env');
    const out = {};
    if (!fs.existsSync(file)) return out;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
    }
    return out;
}

function firstNonEmpty(...vals) {
    for (const v of vals) {
        if (v != null && String(v).trim() !== '') return v;
    }
    return '';
}

const secrets = loadSecretsEnv();
// Same keys as secrets.env. Hosts (Cloudflare Pages, Render) should set these
// as build-time env vars. NUILITH_TURN_* remains a fallback alias.
const turnServer = firstNonEmpty(process.env.turn_server, process.env.NUILITH_TURN_SERVER, secrets.turn_server);
const turnUsername = firstNonEmpty(process.env.expressturn_username, process.env.NUILITH_TURN_USERNAME, secrets.expressturn_username);
const turnPassword = firstNonEmpty(process.env.expressturn_password, process.env.NUILITH_TURN_PASSWORD, secrets.expressturn_password);

export default defineConfig({
  // Vite's default publicDir is "public"; build output is also "public",
  // so static copy-as-is assets live in "static" instead.
  publicDir: 'static',
  define: {
    __NUILITH_TURN_SERVER__: JSON.stringify(turnServer),
    __NUILITH_TURN_USERNAME__: JSON.stringify(turnUsername),
    __NUILITH_TURN_PASSWORD__: JSON.stringify(turnPassword),
  },
  build: {
    outDir: 'public',
    emptyOutDir: true,
    // Keep stable filenames so the service worker precache list stays valid.
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
