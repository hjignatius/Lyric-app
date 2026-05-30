// The song library API the UI talks to. It hides where songs actually live:
//
//   - Connected to pCloud  → songs are .json files in pCloud (source of truth),
//                            mirrored into a localStorage cache for offline use.
//   - Not configured / not connected → the original localStorage library,
//                            so the app keeps working with no pCloud at all.
//
// Every read falls back to the offline cache when a network call fails, so a
// previously-synced device can still browse and open songs with no connection.

import * as pcloud from './pcloud';
import {
  loadLibrary,
  saveSongToLibrary,
  deleteSongFromLibrary,
  loadSetlists,
  writeSetlists,
} from './storage';

const CACHE_KEY = 'chordsheet:pcloud-cache';
const SETLIST_CACHE_KEY = 'chordsheet:setlists-cache';

export const isCloudConnected = pcloud.isConnected;
export const loginCloud = pcloud.loginWithPassword;
export const loginCloud2FA = pcloud.loginWithPassword2FA;
export const handleCloudRedirect = pcloud.handleRedirect;
// OAuth path — used when VITE_PCLOUD_CLIENT_ID is set (pCloud handles 2FA).
export const isOAuthConfigured = pcloud.isOAuthConfigured;
export const connectCloudOAuth = pcloud.connect;

export function disconnectCloud() {
  pcloud.disconnect();
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(SETLIST_CACHE_KEY);
}

const MIGRATION_KEY = 'chordsheet:pcloud-migrated';

// On the first connection from this browser, upload any songs that exist in
// the local localStorage library so they're not abandoned when pCloud takes
// over as the source of truth. Runs at most once per browser (flag-guarded).
// Returns the number of songs successfully uploaded.
export async function migrateLocalToPCloud() {
  if (!pcloud.isConnected()) return 0;
  if (localStorage.getItem(MIGRATION_KEY)) return 0;
  const localSongs = loadLibrary();
  let count = 0;
  for (const song of localSongs) {
    try {
      const uploaded = await pcloud.saveSong({ id: null, metadata: song.metadata, text: song.text });
      cacheSong(uploaded);
      count++;
    } catch { /* skip any that fail — they stay in local library as backup */ }
  }
  localStorage.setItem(MIGRATION_KEY, '1');
  return count;
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') || { list: [], songs: {} };
  } catch {
    return { list: [], songs: {} };
  }
}

function writeCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function cacheList(list) {
  const cache = readCache();
  cache.list = list;
  writeCache(cache);
}

function cacheSong(song) {
  const cache = readCache();
  cache.songs[song.id] = song;
  // Keep the list entry's title/savedAt in step with the saved content.
  const idx = cache.list.findIndex(s => s.id === song.id);
  const entry = { id: song.id, title: song.metadata?.title?.trim() || 'Untitled', savedAt: song.savedAt };
  if (idx >= 0) cache.list[idx] = entry; else cache.list.unshift(entry);
  writeCache(cache);
}

function uncacheSong(id) {
  const cache = readCache();
  delete cache.songs[id];
  cache.list = cache.list.filter(s => s.id !== id);
  writeCache(cache);
}

// Returns list items shaped { id, title, artist?, savedAt }.
export async function listSongs() {
  if (!pcloud.isConnected()) {
    return loadLibrary().map(s => ({
      id: s.id,
      title: s.metadata?.title?.trim() || 'Untitled',
      artist: s.metadata?.artist?.trim() || '',
      savedAt: s.savedAt,
    }));
  }
  try {
    const list = await pcloud.listSongs();
    cacheList(list);
    return list;
  } catch (err) {
    const cached = readCache().list;
    if (cached.length) return cached;
    throw err;
  }
}

// Returns the full song { id, metadata, text, savedAt }.
export async function loadSong(item) {
  if (!pcloud.isConnected()) {
    // Local mode: the full record is already in the localStorage library.
    return loadLibrary().find(s => s.id === item.id) || item;
  }
  try {
    const song = await pcloud.loadSong(item.id);
    cacheSong(song);
    return song;
  } catch (err) {
    const cached = readCache().songs[item.id];
    if (cached) return cached;
    throw err;
  }
}

// Saves and returns the new song id.
export async function saveSong({ id, metadata, text }) {
  if (!pcloud.isConnected()) {
    return saveSongToLibrary({ id, metadata, text });
  }
  const song = await pcloud.saveSong({ id, metadata, text });
  cacheSong(song);
  return song.id;
}

export async function deleteSong(id) {
  if (!pcloud.isConnected()) {
    deleteSongFromLibrary(id);
    return;
  }
  await pcloud.deleteSong(id);
  uncacheSong(id);
}

// ---- Setlists -------------------------------------------------------------
// A setlist is { id, name, songIds: [...], savedAt }. songIds reference song
// ids (a pCloud path in cloud mode). The whole collection is read and written
// together — small enough that per-item diffing isn't worth it. In cloud mode
// it's one pCloud file mirrored to a localStorage cache for offline use.

function readSetlistCache() {
  try {
    return JSON.parse(localStorage.getItem(SETLIST_CACHE_KEY) || 'null') || [];
  } catch {
    return [];
  }
}

function writeSetlistCache(setlists) {
  localStorage.setItem(SETLIST_CACHE_KEY, JSON.stringify(setlists));
}

export async function listSetlists() {
  if (!pcloud.isConnected()) return loadSetlists();
  try {
    const setlists = await pcloud.loadSetlistsDoc();
    writeSetlistCache(setlists);
    return setlists;
  } catch {
    return readSetlistCache();
  }
}

// Reads the authoritative collection for a read-modify-write. Unlike
// listSetlists() this doesn't fall back to a stale cache, so a save/delete
// never silently drops concurrent changes from the source of truth.
async function readSetlistsForWrite() {
  if (!pcloud.isConnected()) return loadSetlists();
  return pcloud.loadSetlistsDoc();
}

async function writeAllSetlists(setlists) {
  if (!pcloud.isConnected()) {
    writeSetlists(setlists);
    return;
  }
  await pcloud.saveSetlistsDoc(setlists);
  writeSetlistCache(setlists);
}

// Creates or updates a setlist; returns the saved record (with its id).
export async function saveSetlist({ id, name, songIds }) {
  const setlists = await readSetlistsForWrite();
  const now = Date.now();
  const sid = id || `setlist_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const entry = {
    id: sid,
    name: name?.trim() || 'Untitled set',
    songIds: songIds || [],
    savedAt: now,
  };
  const idx = setlists.findIndex(s => s.id === sid);
  if (idx >= 0) setlists[idx] = entry; else setlists.unshift(entry);
  await writeAllSetlists(setlists);
  return entry;
}

export async function deleteSetlist(id) {
  const setlists = await readSetlistsForWrite();
  await writeAllSetlists(setlists.filter(s => s.id !== id));
}
