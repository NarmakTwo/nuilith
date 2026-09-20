/**
 * Peer-to-peer project/script sharing.
 *
 * Discovery uses Trystero's BitTorrent strategy (public trackers). The actual
 * payload travels on a WebRTC data channel. When STUN/hole-punching fails,
 * ICE falls back to the ExpressTURN credentials injected at Vite build time.
 *
 * Room identity is a 6 or 7 character hex string. Trystero namespaces it with
 * APP_ID so Nuilith rooms do not collide with other apps on the same trackers.
 *
 * Do not log TURN usernames or credentials. They ship in the client bundle
 * because WebRTC ICE must present them to the browser.
 */

import { joinRoom } from '@trystero-p2p/torrent';

const APP_ID = 'nuilith-share';

let shareRoom = null;
let receiveRoom = null;
let shareAction = null;
let receiveAction = null;

function readDefine(name, fallback = '') {
    try {
        // Vite replaces these identifiers at build time.
        if (name === 'server') return __NUILITH_TURN_SERVER__;
        if (name === 'user') return __NUILITH_TURN_USERNAME__;
        if (name === 'pass') return __NUILITH_TURN_PASSWORD__;
    } catch {
        return fallback;
    }
    return fallback;
}

/**
 * ExpressTURN ICE server list. Empty when secrets.env / build env is missing;
 * Trystero still tries its default STUN servers in that case.
 */
export function getTurnConfig() {
    const host = String(readDefine('server') || '').trim();
    const username = String(readDefine('user') || '').trim();
    const credential = String(readDefine('pass') || '').trim();
    if (!host || !username || !credential) return [];
    const urls = host.includes('://') ? host : `turn:${host}`;
    return [{ urls: [urls], username, credential }];
}

function roomConfig() {
    const turnConfig = getTurnConfig();
    const config = { appId: APP_ID };
    if (turnConfig.length) config.turnConfig = turnConfig;
    return config;
}

export function roomTopic(code) {
    return `nuilith:${normalizeShareCode(code)}`;
}

export function generateShareCode() {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const len = 6 + (bytes[3] % 2);
    return hex.slice(0, len);
}

export function normalizeShareCode(code) {
    return String(code || '').trim().toLowerCase().replace(/[^0-9a-f]/g, '');
}

export function isValidShareCode(code) {
    return /^[0-9a-f]{6,7}$/.test(normalizeShareCode(code));
}

function peerCount(room) {
    if (!room) return 0;
    try {
        return Object.keys(room.getPeers() || {}).length;
    } catch {
        return 0;
    }
}

async function leaveRoom(room) {
    if (!room) return;
    try {
        await room.leave();
    } catch {
        // Already closed or page is unloading.
    }
}

export function isSharing() {
    return !!shareRoom;
}

/**
 * Host a share session. `payload` is JSON (files, packages, entryScript).
 * Stays live until stopShare() or the tab unloads.
 */
export async function startShare(payload, handlers = {}) {
    const { onPeerCount, onStatus, onError } = handlers;
    await stopShare();

    const code = payload.shareCode && isValidShareCode(payload.shareCode)
        ? normalizeShareCode(payload.shareCode)
        : generateShareCode();

    const bundle = {
        v: 1,
        kind: payload.kind === 'files' ? 'files' : 'project',
        projectName: payload.projectName || 'shared',
        files: payload.files || [],
        packages: payload.packages || [],
        entryScript: payload.entryScript || null
    };

    shareRoom = joinRoom(roomConfig(), roomTopic(code), {
        onJoinError: (details) => {
            onError?.(details?.error || 'Could not join the share room');
        }
    });
    shareAction = shareRoom.makeAction('bundle');

    const sendTo = (peerId) => {
        shareAction.send(bundle, peerId ? { target: peerId } : undefined).catch((err) => {
            onError?.(String(err?.message || err));
        });
    };

    shareRoom.onPeerJoin = (peerId) => {
        sendTo(peerId);
        onPeerCount?.(peerCount(shareRoom));
        onStatus?.('connected');
    };
    shareRoom.onPeerLeave = () => {
        const n = peerCount(shareRoom);
        onPeerCount?.(n);
        onStatus?.(n > 0 ? 'connected' : 'waiting');
    };

    onStatus?.('waiting');
    onPeerCount?.(0);
    return { code };
}

export async function stopShare() {
    shareAction = null;
    const room = shareRoom;
    shareRoom = null;
    await leaveRoom(room);
}

/**
 * Join a host by hex code. Resolves with the first bundle, then leaves.
 * Returns a cancel function for the Import UI.
 */
export function receiveShare(code, handlers = {}) {
    const { onBundle, onStatus, onError } = handlers;
    const normalized = normalizeShareCode(code);
    if (!isValidShareCode(normalized)) {
        onError?.('Share code must be 6 or 7 hex characters');
        return () => {};
    }

    leaveReceive();
    onStatus?.('connecting');

    receiveRoom = joinRoom(roomConfig(), roomTopic(normalized), {
        onJoinError: (details) => {
            onError?.(details?.error || 'Could not join the share room');
        }
    });
    receiveAction = receiveRoom.makeAction('bundle');
    receiveAction.onMessage = (data) => {
        if (!data || typeof data !== 'object') return;
        onStatus?.('received');
        onBundle?.(data);
        leaveReceive();
    };
    receiveRoom.onPeerJoin = () => {
        onStatus?.('connected');
    };

    return () => leaveReceive();
}

export function leaveReceive() {
    receiveAction = null;
    const room = receiveRoom;
    receiveRoom = null;
    // Fire-and-forget: callers on the unload path cannot await.
    leaveRoom(room);
}

/**
 * Tear down both sides immediately. Used from pagehide/beforeunload so the
 * host drops the room before the tab actually disappears.
 */
export function haltShareSessions() {
    shareAction = null;
    receiveAction = null;
    const share = shareRoom;
    const recv = receiveRoom;
    shareRoom = null;
    receiveRoom = null;
    if (share) {
        try { share.leave(); } catch { /* unload */ }
    }
    if (recv) {
        try { recv.leave(); } catch { /* unload */ }
    }
}
