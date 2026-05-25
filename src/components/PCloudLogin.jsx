import { useState } from 'react';
import { loginCloud } from '../utils/library';

export default function PCloudLogin({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await loginCloud(email.trim(), password);
      onSuccess();
    } catch (err) {
      const msg = err?.message || '';
      if (/code|tfa|two/i.test(msg)) {
        setError('This account uses two-factor auth, which isn’t supported yet.');
      } else {
        setError('Login failed. Check your email and password.');
      }
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 001-9.9A5 5 0 005.1 8.1 4 4 0 003 15z" />
          </svg>
          <h2 className="text-lg font-bold text-gray-900">Connect pCloud</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Sign in to sync your songs across devices.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">pCloud email</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-semibold rounded-lg text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !email.trim() || !password}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {busy && <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>

        <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
          Your password is hashed and sent only to pCloud — never stored. We keep
          only the access token pCloud returns. EU and US accounts are detected
          automatically.
        </p>
      </div>
    </div>
  );
}
