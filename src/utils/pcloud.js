// pCloud REST client for a no-backend SPA.
//
// Two ways to authenticate, both yielding a token we store and reuse:
//
//   1. Direct login (default): email + password via the `login` method. We
//      never send the raw password — pCloud issues a one-time `digest` and we
//      send sha1(password + sha1(lower(email)) + digest). `login` also needs a
//      deviceid + os. 2FA accounts reply 2297 with a one-time `token`; the
//      verification code is sent on a second `login` call with that token (and
//      trustdevice=1, so the device is remembered). Only the returned auth
//      token is stored. No app/client-id registration needed.
//   2. OAuth2 implicit flow (kept for the future, needs VITE_PCLOUD_CLIENT_ID):
//      redirect to pCloud, come back with an access_token in the URL.
//
// pCloud has two data regions; the API host differs (1/US = api.pcloud.com,
// 2/EU = eapi.pcloud.com). Direct login tries EU first then US; OAuth learns
// the region from the redirect's locationid. All song data lives as individual
// .json files in a /ChordSheet folder, so it stays browsable in pCloud's apps.

const CLIENT_ID = import.meta.env.VITE_PCLOUD_CLIENT_ID || '';
const AUTH_KEY = 'chordsheet:pcloud-auth';
const SONG_FOLDER = '/ChordSheet';
const AUTHORIZE_URL = 'https://my.pcloud.com/oauth2/authorize';

const HOSTS = { 1: 'api.pcloud.com', 2: 'eapi.pcloud.com' };
const LOGIN_HOSTS = ['eapi.pcloud.com', 'api.pcloud.com']; // EU first

// True when the OAuth path is usable. Direct login never needs this.
export function isOAuthConfigured() {
  return !!CLIENT_ID;
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

// auth = { token, host, param }  — param is 'auth' (login) or 'access_token' (OAuth).
function setAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function isConnected() {
  const a = getAuth();
  return !!(a && a.token && a.host);
}

export function disconnect() {
  localStorage.removeItem(AUTH_KEY);
}

function requireAuth() {
  const auth = getAuth();
  if (!auth?.token) throw new Error('Not connected to pCloud');
  return auth;
}

async function sha1hex(str) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`pCloud HTTP ${res.status}`);
  return res.json();
}

// ---- Direct email/password login -----------------------------------------

// A stable per-browser device id. Persisted so `trustdevice` works: once a
// device is trusted, pCloud's login stops demanding a 2FA code on it.
const DEVICE_KEY = 'chordsheet:pcloud-deviceid';
function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `chordsheet-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

// One call to the `login` method (the only one that carries a 2FA code over
// HTTP — userinfo can't). A fresh digest is fetched each call since it's
// single-use, so the raw password stays local. `login` requires deviceid + os;
// `extra` adds the 2FA params (token, code, trustdevice) on the second call.
async function loginRequest(host, email, password, extra = {}) {
  const dg = await fetchJson(`https://${host}/getdigest`);
  if (dg.result !== 0 || !dg.digest) throw new Error('Could not start login');
  const inner = await sha1hex(email.toLowerCase());
  const passworddigest = await sha1hex(password + inner + dg.digest);
  const qs = new URLSearchParams({
    getauth: '1',
    username: email.toLowerCase(),
    digest: dg.digest,
    passworddigest,
    deviceid: deviceId(),
    device: 'ChordSheet Web',
    os: '4',
    osversion: '1',
    appversion: '1',
    ...extra,
  });
  return fetchJson(`https://${host}/login?${qs}`);
}

async function tryLogin(host, email, password) {
  const info = await loginRequest(host, email, password);
  // 2297 = credentials accepted, account has 2FA. The reply carries a one-time
  // token in `token`; the code is sent on a second login call alongside it.
  if (info.result === 2297) {
    const err = new Error('Two-factor authentication required');
    err.result = 2297;
    err.needs2FA = true;
    err.tfatoken = info.token;
    throw err;
  }
  if (info.result !== 0 || !info.auth) {
    const err = new Error(info.error || `Login failed (${info.result})`);
    err.result = info.result;
    throw err;
  }
  return info.auth;
}

// Logs in and stores the token. Tries EU then US so the account region is
// found automatically. Returns the host that worked.
// Throws with err.needs2FA = true, err.host and err.tfatoken when 2FA is
// required — the caller collects a code and calls loginWithPassword2FA().
export async function loginWithPassword(email, password) {
  let lastErr;
  for (const host of LOGIN_HOSTS) {
    try {
      const token = await tryLogin(host, email, password);
      setAuth({ token, host, param: 'auth' });
      return { host };
    } catch (err) {
      if (err.needs2FA) {
        err.host = host; // 2297 means the region was right; retry the code here
        throw err;
      }
      lastErr = err;
    }
  }
  throw lastErr || new Error('Login failed');
}

// Completes a 2FA login: re-runs the login call with the one-time `token` from
// the needs2FA error plus the user's `code`. trustdevice=1 marks this device
// (its persisted deviceid) trusted so future logins skip the 2FA prompt.
export async function loginWithPassword2FA(host, email, password, tfatoken, code) {
  const info = await loginRequest(host, email, password, {
    token: tfatoken,
    code,
    trustdevice: '1',
  });
  if (info.result !== 0 || !info.auth) {
    const err = new Error(info.error || `2FA failed (${info.result})`);
    err.result = info.result;
    throw err;
  }
  setAuth({ token: info.auth, host, param: 'auth' });
  return { host };
}

// ---- OAuth2 implicit flow (optional, needs a client id) -------------------

function redirectUri() {
  return window.location.origin + window.location.pathname;
}

export function connect() {
  if (!CLIENT_ID) throw new Error('pCloud client id is not configured');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'token',
    redirect_uri: redirectUri(),
  });
  window.location.href = `${AUTHORIZE_URL}?${params}`;
}

export function handleRedirect() {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const fromQuery = new URLSearchParams(window.location.search);
  const token = fromHash.get('access_token') || fromQuery.get('access_token');
  const locationid = fromHash.get('locationid') || fromQuery.get('locationid');
  if (!token) return false;

  const host = HOSTS[Number(locationid)] || HOSTS[2];
  setAuth({ token, host, param: 'access_token' });
  window.history.replaceState({}, '', redirectUri());
  return true;
}

// ---- REST API -------------------------------------------------------------

async function apiGet(method, params = {}) {
  const { token, host, param } = requireAuth();
  const qs = new URLSearchParams({ [param]: token, ...params });
  const data = await fetchJson(`https://${host}/${method}?${qs}`);
  if (data.result !== 0) {
    if (data.result === 1000 || data.result === 2000 || data.result === 2094) disconnect();
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

export async function loadSong(path) {
  const link = await apiGet('getfilelink', { path });
  const host = link.hosts?.[0];
  if (!host) throw new Error('pCloud returned no download host');
  const res = await fetch(`https://${host}${link.path}`);
  if (!res.ok) throw new Error(`pCloud download HTTP ${res.status}`);
  const song = await res.json();
  return { ...song, id: path };
}

export async function saveSong({ id, metadata, text }) {
  await ensureFolder();
  const savedAt = Date.now();
  const filename = `${sanitizeFilename(metadata?.title)}.json`;
  const newPath = `${SONG_FOLDER}/${filename}`;
  const payload = { id: newPath, metadata, text, savedAt };

  const { token, host, param } = requireAuth();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const form = new FormData();
  form.append(filename, blob, filename);
  const qs = new URLSearchParams({ [param]: token, path: SONG_FOLDER, nopartial: '1' });
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
