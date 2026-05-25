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
} from './storage';

const CACHE_KEY = 'chordsheet:pcloud-cache';

export const isCloudConfigured = pcloud.isConfigured;
export const isCloudConnected = pcloud.isConnected;
export const connectCloud = pcloud.connect;
export const handleCloudRedirect = pcloud.handleRedirect;

export function disconnectCloud() {
  pcloud.disconnect();
  localStorage.removeItem(CACHE_KEY);
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
