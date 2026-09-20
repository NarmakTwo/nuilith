# Peer Code Sharing (WebRTC)

Relevant source files: `share.js`, `index.js`, `index.html`, `vite.config.js`, `static/sw.js`, `secrets.env` (gitignored).

Nuilith can send a project or selected scripts from one browser to another without a Nuilith backend. Discovery uses Trystero (`@trystero-p2p/torrent`) over public BitTorrent trackers. The payload itself travels on a WebRTC data channel. When STUN cannot punch a hole, ICE falls back to ExpressTURN credentials inlined at Vite build time from `secrets.env` or the same keys as build env vars (`turn_server`, `expressturn_username`, `expressturn_password`).

Do not print TURN usernames or passwords in the UI, logs, or docs. They must live in the client bundle because the browser presents them during ICE.

## Share code

The host creates a 6 or 7 character hex string (typed or rolled at random). Trystero rooms are namespaced as `nuilith:{code}` under app id `nuilith-share`.

The host picks either the entire project (files, declared packages, entry script) or a subset of scripts, then starts sharing. The session stays open until Cancel or the tab unloads (`pagehide` / `beforeunload` call `haltShareSessions()` so the room is left before the tab disappears). Closing the Share dialog does not stop an active host session. A header chip shows the live code and Cancel.

The receiver types the same hex code and chooses a destination: a new project, the current project, or another existing project. Incoming `.py` files overwrite same-named files. Declared packages are merged and installed through the same restore path used on Run.

## TURN at build time

`vite.config.js` reads `secrets.env` locally. On a host, set the same keys as **build-time** environment variables: `turn_server`, `expressturn_username`, `expressturn_password`. Vite inlines them into the client bundle. A build without those values still shares on LAN/STUN, but WAN peers may fail to connect.

On Cloudflare Pages: Workers & Pages, open the project, Settings, Variables and Secrets (or Environment variables), Add. Use those three names, apply to Production (and Preview if you want preview deploys to share too), then trigger a new deployment. Dashboard env vars are injected during `npm run build`; Pages Functions bindings are not used, because this is a static Vite site.

## Service worker

Cache `nuilith-cache-v13` skips non-GET requests and URLs that look like trackers or TURN so signaling is not stale-cached.
