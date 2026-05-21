// localStorage helpers for ChordSheet.
// - "current" holds the active draft so a reload never loses work.
// - "library" holds the user's saved songs, keyed by id.

const CURRENT_KEY = 'chordsheet:current';
const LIBRARY_KEY = 'chordsheet:library';

function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function loadCurrent() {
  return safeParse(localStorage.getItem(CURRENT_KEY), null);
}

export function saveCurrent(state) {
  localStorage.setItem(CURRENT_KEY, JSON.stringify(state));
}

export function loadLibrary() {
  return safeParse(localStorage.getItem(LIBRARY_KEY), []);
}

function writeLibrary(songs) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(songs));
}

export function saveSongToLibrary({ id, metadata, text }) {
  const songs = loadLibrary();
  const now = Date.now();
  const songId = id || `song_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const existing = songs.findIndex(s => s.id === songId);
  const entry = { id: songId, metadata, text, savedAt: now };
  if (existing >= 0) {
    songs[existing] = entry;
  } else {
    songs.unshift(entry);
  }
  writeLibrary(songs);
  return songId;
}

export function deleteSongFromLibrary(id) {
  writeLibrary(loadLibrary().filter(s => s.id !== id));
}
