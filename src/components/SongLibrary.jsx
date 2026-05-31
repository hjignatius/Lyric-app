import { useEffect, useRef, useState } from 'react';
import { listSongs, loadSong, saveSong, deleteSong } from '../utils/library';

function formatRelative(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function SongLibrary({
  text,
  metadata,
  currentId,
  onLoad,
  onSavedId,
  onNew,
  cloudConnected,
}) {
  const [open, setOpen] = useState(false);
  const [songs, setSongs] = useState([]);
  const [flash, setFlash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const ref = useRef(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setSongs(await listSongs());
    } catch {
      setError('Could not load songs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
  }, [open, cloudConnected]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function handleSave() {
    if (!text?.trim()) return;
    setFlash('Saving…');
    try {
      const id = await saveSong({ id: currentId, metadata, text });
      onSavedId?.(id);
      setFlash(currentId ? 'Updated' : 'Saved');
      if (open) refresh();
    } catch {
      setFlash('Save failed');
    }
    setTimeout(() => setFlash(null), 1500);
  }

  async function handleLoad(item) {
    setBusyId(item.id);
    try {
      const song = await loadSong(item);
      onLoad(song);
      setOpen(false);
    } catch (err) {
      setError(`Could not open this song: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Delete this song?')) return;
    try {
      await deleteSong(id);
      if (id === currentId) onSavedId?.(null);
      refresh();
    } catch {
      setError('Could not delete this song');
    }
  }

  const saveLabel = currentId ? 'Update' : 'Save';

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      <button
        onClick={handleSave}
        disabled={!text?.trim()}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={currentId ? 'Update saved song' : 'Save to library'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" style={{ display: 'none' }} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-4-3v8m0 0l-3-3m3 3l3-3" transform="rotate(180 12 12)" />
        </svg>
        {flash || saveLabel}
      </button>

      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 transition-colors"
        title="Open song library"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Songs
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {cloudConnected ? 'My Songs · pCloud' : 'My Songs'}
            </span>
            <button
              onClick={() => { onNew(); setOpen(false); }}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              + New
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <p className="p-4 text-sm text-gray-400 italic text-center">Loading…</p>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button onClick={refresh} className="mt-2 text-xs text-violet-600 hover:text-violet-800 font-medium">
                  Retry
                </button>
              </div>
            ) : songs.length === 0 ? (
              <p className="p-4 text-sm text-gray-400 italic text-center">
                No saved songs yet. Click <strong>Save</strong> to add one.
              </p>
            ) : (
              <ul>
                {songs.map(song => {
                  const title = song.title?.trim() || 'Untitled';
                  const artist = song.artist?.trim();
                  const isCurrent = song.id === currentId;
                  return (
                    <li
                      key={song.id}
                      onClick={() => handleLoad(song)}
                      className={`group flex items-start gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-violet-50 ${isCurrent ? 'bg-violet-50/60' : ''} ${busyId === song.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-medium">current</span>
                          )}
                        </div>
                        {artist && <p className="text-xs text-gray-500 truncate">{artist}</p>}
                        <p className="text-[11px] text-gray-400">{formatRelative(song.savedAt)}</p>
                      </div>
                      <button
                        onClick={e => handleDelete(e, song.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
