import { useEffect, useRef, useState } from 'react';
import { listSetlists, saveSetlist, deleteSetlist, listSongs, loadSong } from '../utils/library';

// Toolbar dropdown for managing setlists and launching performance mode.
// Two views inside the panel: a list of setlists, and an editor for one.

function move(arr, from, to) {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export default function SetlistManager({ onPerform, cloudConnected }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'edit'
  const [setlists, setSetlists] = useState([]);
  const [songs, setSongs] = useState([]); // library list: { id, title, artist }
  const [draft, setDraft] = useState(null); // setlist being edited
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  // Quick id → title lookup for showing song names inside a setlist.
  const titleById = Object.fromEntries(songs.map(s => [s.id, s.title]));

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [sl, sg] = await Promise.all([listSetlists(), listSongs()]);
      setSetlists(sl);
      setSongs(sg);
    } catch {
      setError('Could not load setlists');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) { setView('list'); refresh(); }
  }, [open, cloudConnected]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function startNew() {
    setDraft({ id: null, name: '', songIds: [] });
    setView('edit');
  }

  function startEdit(sl) {
    setDraft({ id: sl.id, name: sl.name, songIds: [...(sl.songIds || [])] });
    setView('edit');
  }

  async function handleSave() {
    if (!draft) return;
    setBusy(true);
    try {
      await saveSetlist(draft);
      await refresh();
      setView('list');
      setDraft(null);
    } catch {
      setError('Could not save the setlist');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Delete this setlist? (Your songs are not affected.)')) return;
    try {
      await deleteSetlist(id);
      refresh();
    } catch {
      setError('Could not delete the setlist');
    }
  }

  // Load every song in a setlist (in order) and hand them to performance mode.
  // Songs that can't be found/loaded become a `missing` placeholder so the set
  // still plays through.
  async function handlePerform(sl) {
    const ids = sl.songIds || [];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const loaded = await Promise.all(ids.map(async id => {
        try {
          const song = await loadSong({ id });
          return { metadata: song.metadata || {}, text: song.text || '' };
        } catch {
          return { missing: true, metadata: { title: titleById[id] || 'Missing song' }, text: '' };
        }
      }));
      setOpen(false);
      onPerform(loaded, 0);
    } catch {
      setError('Could not start the setlist');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 transition-colors"
        title="Setlists & performance mode"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        Setlists
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[28rem] bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden flex flex-col">
          {view === 'list' ? (
            <>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {cloudConnected ? 'Setlists · pCloud' : 'Setlists'}
                </span>
                <button onClick={startNew} className="text-xs text-violet-600 hover:text-violet-800 font-medium">
                  + New setlist
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <p className="p-4 text-sm text-gray-400 italic text-center">Loading…</p>
                ) : error ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-red-500">{error}</p>
                    <button onClick={refresh} className="mt-2 text-xs text-violet-600 hover:text-violet-800 font-medium">Retry</button>
                  </div>
                ) : setlists.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400 italic text-center">
                    No setlists yet. Click <strong>+ New setlist</strong> to build one.
                  </p>
                ) : (
                  <ul>
                    {setlists.map(sl => (
                      <li
                        key={sl.id}
                        className="group flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-violet-50"
                      >
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEdit(sl)}>
                          <p className="text-sm font-semibold text-gray-900 truncate">{sl.name || 'Untitled set'}</p>
                          <p className="text-[11px] text-gray-400">{(sl.songIds || []).length} song{(sl.songIds || []).length === 1 ? '' : 's'}</p>
                        </div>
                        <button
                          onClick={() => handlePerform(sl)}
                          disabled={busy || (sl.songIds || []).length === 0}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white"
                          title="Perform this setlist"
                        >
                          ▶ Perform
                        </button>
                        <button
                          onClick={e => handleDelete(e, sl.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                          title="Delete setlist"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <SetlistEditor
              draft={draft}
              setDraft={setDraft}
              songs={songs}
              titleById={titleById}
              busy={busy}
              onBack={() => { setView('list'); setDraft(null); }}
              onSave={handleSave}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SetlistEditor({ draft, setDraft, songs, titleById, busy, onBack, onSave }) {
  const [adding, setAdding] = useState(false);
  if (!draft) return null;

  const setSongIds = ids => setDraft(d => ({ ...d, songIds: ids }));

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <button onClick={onBack} className="text-xs font-semibold text-gray-500 hover:text-gray-800">← Back</button>
        <input
          value={draft.name}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          placeholder="Setlist name"
          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
          autoFocus
        />
        <button
          onClick={onSave}
          disabled={busy}
          className="px-3 py-1 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Ordered songs in the setlist */}
        {draft.songIds.length === 0 ? (
          <p className="px-3 py-3 text-sm text-gray-400 italic">No songs yet — add some below.</p>
        ) : (
          <ul>
            {draft.songIds.map((id, i) => (
              <li key={`${id}-${i}`} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100">
                <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                <span className={`flex-1 text-sm truncate ${titleById[id] ? 'text-gray-800' : 'text-amber-600 italic'}`}>
                  {titleById[id] || 'Missing song'}
                </span>
                <button
                  onClick={() => i > 0 && setSongIds(move(draft.songIds, i, i - 1))}
                  disabled={i === 0}
                  className="text-gray-400 hover:text-violet-600 disabled:opacity-20"
                  title="Move up"
                >▲</button>
                <button
                  onClick={() => i < draft.songIds.length - 1 && setSongIds(move(draft.songIds, i, i + 1))}
                  disabled={i === draft.songIds.length - 1}
                  className="text-gray-400 hover:text-violet-600 disabled:opacity-20"
                  title="Move down"
                >▼</button>
                <button
                  onClick={() => setSongIds(draft.songIds.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500"
                  title="Remove from setlist"
                >✕</button>
              </li>
            ))}
          </ul>
        )}

        {/* Add songs */}
        <div className="border-t border-gray-200">
          <button
            onClick={() => setAdding(a => !a)}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50"
          >
            {adding ? '▾ Add songs' : '▸ Add songs from your library'}
          </button>
          {adding && (
            songs.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400 italic">No saved songs to add.</p>
            ) : (
              <ul className="pb-1">
                {songs.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSongIds([...draft.songIds, s.id])}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-violet-50"
                    >
                      <span className="text-violet-500 font-bold">+</span>
                      <span className="flex-1 text-sm text-gray-800 truncate">{s.title}</span>
                      {s.artist && <span className="text-[11px] text-gray-400 truncate">{s.artist}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>
    </>
  );
}
