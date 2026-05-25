// pCloud REST client for a no-backend SPA.
//
// Auth is the OAuth2 implicit ("token") flow: we redirect the browser to
// pCloud, the user approves, pCloud redirects back with an access_token and a
// locationid telling us which data region the account lives in (1 = US,
// 2 = EU). We persist both and talk directly to the region's API host from
// the browser — there is no server in the middle.
//
// All song data lives as individual .json files in a /ChordSheet folder, so
// it stays browsable in the normal pCloud apps.

const CLIENT_ID = import.meta.env.VITE_PCLOUD_CLIENT_ID || '';
const AUTH_KEY = 'chordsheet:pcloud-auth';
const SONG_FOLDER = '/ChordSheet';
const AUTHORIZE_URL = 'https://my.pcloud.com/oauth2/authorize';

// locationid → API hostname. EU accounts must use eapi.* or calls 404/forbid.
const HOSTS = { 1: 'api.pcloud.com', 2: 'eapi.pcloud.com' };

export function isConfigured() {
  return !!CLIENT_ID;
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

function setAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function isConnected() {
  const a = getAuth();
  return !!(a && a.access_token && a.host);
}

export function disconnect() {
  localStorage.removeItem(AUTH_KEY);
}

// The page pCloud redirects back to. Must be registered verbatim in the
// pCloud app's settings (both the localhost dev URL and the Vercel URL).
function redirectUri() {
  return window.location.origin + window.location.pathname;
}

// Kick off the OAuth flow by navigating away to pCloud's consent screen.
export function connect() {
  if (!CLIENT_ID) throw new Error('pCloud client id is not configured');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'token',
    redirect_uri: redirectUri(),
  });
  window.location.href = `${AUTHORIZE_URL}?${params}`;
}

// On app load, capture the token pCloud appended to our URL (it may arrive in
// the hash fragment or the query string depending on the flow), store it, and
// scrub it from the address bar. Returns true if we just connected.
export function handleRedirect() {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const fromQuery = new URLSearchParams(window.location.search);
  const token = fromHash.get('access_token') || fromQuery.get('access_token');
  const locationid = fromHash.get('locationid') || fromQuery.get('locationid');
  if (!token) return false;

  const host = HOSTS[Number(locationid)] || HOSTS[2];
  setAuth({ access_token: token, host });
  // Remove the token from the URL so a refresh/bookmark doesn't leak it.
  window.history.replaceState({}, '', redirectUri());
  return true;
}

function requireAuth() {
  const auth = getAuth();
  if (!auth?.access_token) throw new Error('Not connected to pCloud');
  return auth;
}

// GET helper. pCloud returns JSON with a `result` field; non-zero means error.
async function apiGet(method, params = {}) {
  const { access_token, host } = requireAuth();
  const qs = new URLSearchParams({ access_token, ...params });
  const res = await fetch(`https://${host}/${method}?${qs}`);
  if (!res.ok) throw new Error(`pCloud ${method} HTTP ${res.status}`);
  const data = await res.json();
  if (data.result !== 0) {
    if (data.result === 2000 || data.result === 1000) disconnect(); // bad/expired token
    throw new Error(data.error || `pCloud ${method} error ${data.result}`);
  }
  return data;
}

function sanitizeFilename(name) {
  const cleaned = (name || 'Untitled')
    .replace(/[/\\:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || 'Untitled';
}

async function ensureFolder() {
  await apiGet('createfolderifnotexists', { path: SONG_FOLDER });
}

// Returns lightweight list items: { id (path), title, savedAt }.
// Artist/key/tempo live inside each file and load on demand in loadSong().
export async function listSongs() {
  await ensureFolder();
  const data = await apiGet('listfolder', { path: SONG_FOLDER });
  const contents = data.metadata?.contents || [];
  return contents
    .filter(e => !e.isfolder && e.name.toLowerCase().endsWith('.json'))
    .map(e => ({
      id: `${SONG_FOLDER}/${e.name}`,
      title: e.name.replace(/\.json$/i, ''),
      savedAt: (e.modified ? new Date(e.modified).getTime() : Date.now()),
    }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

// Resolves a file path to a temporary download URL, then fetches the content.
export async function loadSong(path) {
  const link = await apiGet('getfilelink', { path });
  const host = link.hosts?.[0];
  if (!host) throw new Error('pCloud returned no download host');
  const res = await fetch(`https://${host}${link.path}`);
  if (!res.ok) throw new Error(`pCloud download HTTP ${res.status}`);
  const song = await res.json();
  return { ...song, id: path };
}

// Writes a song file, overwriting any existing file with the same title.
// If the title changed (so the filename changed), the old file is removed so
// renames don't leave an orphan. Returns the new song record.
export async function saveSong({ id, metadata, text }) {
  await ensureFolder();
  const savedAt = Date.now();
  const filename = `${sanitizeFilename(metadata?.title)}.json`;
  const newPath = `${SONG_FOLDER}/${filename}`;
  const payload = { id: newPath, metadata, text, savedAt };

  const { access_token, host } = requireAuth();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const form = new FormData();
  form.append(filename, blob, filename);
  const qs = new URLSearchParams({
    access_token,
    path: SONG_FOLDER,
    nopartial: '1',
  });
  const res = await fetch(`https://${host}/uploadfile?${qs}`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`pCloud upload HTTP ${res.status}`);
  const data = await res.json();
  if (data.result !== 0) throw new Error(data.error || `pCloud upload error ${data.result}`);

  if (id && id !== newPath) {
    try { await deleteSong(id); } catch { /* old file already gone — ignore */ }
  }
  return { ...payload };
}

export async function deleteSong(path) {
  await apiGet('deletefile', { path });
}
