import { useEffect, useMemo, useRef, useState } from 'react';
import MetadataForm from './components/MetadataForm';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Toolbar from './components/Toolbar';
import { loadCurrent, saveCurrent } from './utils/storage';
import {
  isCloudConfigured,
  isCloudConnected,
  connectCloud,
  disconnectCloud,
  handleCloudRedirect,
} from './utils/library';
import { parseChordPro } from './utils/chordPro';
import { computeFitScale } from './utils/pageBreaks';
import './index.css';

const DEFAULT_METADATA = { title: '', artist: '', key: '', tempo: '' };

export default function App() {
  const [text, setText] = useState('');
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [currentId, setCurrentId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [fitToOnePage, setFitToOnePage] = useState(false);
  const [cloudConnected, setCloudConnected] = useState(false);
  const hydrated = useRef(false);

  const parsedLines = useMemo(() => parseChordPro(text || ''), [text]);
  const fitInfo = useMemo(() => computeFitScale(parsedLines, metadata), [parsedLines, metadata]);
  const activeScale = fitToOnePage ? fitInfo.scale : 1;

  // Capture a returning pCloud OAuth token (if any), then restore the draft.
  useEffect(() => {
    handleCloudRedirect();
    setCloudConnected(isCloudConnected());
    const draft = loadCurrent();
    if (draft) {
      setText(draft.text || '');
      setMetadata({ ...DEFAULT_METADATA, ...(draft.metadata || {}) });
      setCurrentId(draft.currentId || null);
    }
    hydrated.current = true;
  }, []);

  function handleDisconnectCloud() {
    disconnectCloud();
    setCloudConnected(false);
  }

  // Auto-save the current editor state on every change.
  useEffect(() => {
    if (!hydrated.current) return;
    saveCurrent({ text, metadata, currentId });
    setSavedAt(Date.now());
  }, [text, metadata, currentId]);

  function handleLoadSong(song) {
    setText(song.text || '');
    setMetadata({ ...DEFAULT_METADATA, ...(song.metadata || {}) });
    setCurrentId(song.id);
  }

  function handleNewSong() {
    if (text.trim() && !confirm('Start a new song? Your current draft will be cleared (saved songs are kept).')) return;
    setText('');
    setMetadata(DEFAULT_METADATA);
    setCurrentId(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-gray-50 to-purple-50 flex flex-col">
      <header className="px-6 pt-6 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🎵</span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ChordSheet</h1>
            <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-medium">PDF Exporter</span>
          </div>
          <p className="text-sm text-gray-500 ml-10">
            Enter your song in ChordPro format — chords in [brackets] inline with lyrics
          </p>
        </div>
      </header>

      <main className="flex-1 px-6 pb-6 flex flex-col gap-4 max-w-7xl mx-auto w-full">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <MetadataForm metadata={metadata} onChange={setMetadata} />
        </div>

        <Toolbar
          text={text}
          onChange={setText}
          metadata={metadata}
          currentId={currentId}
          onLoadSong={handleLoadSong}
          onNewSong={handleNewSong}
          onSavedId={setCurrentId}
          autosavedAt={savedAt}
          fitToOnePage={fitToOnePage}
          onToggleFit={() => setFitToOnePage(v => !v)}
          fitInfo={fitInfo}
          activeScale={activeScale}
          cloudConfigured={isCloudConfigured()}
          cloudConnected={cloudConnected}
          onConnectCloud={connectCloud}
          onDisconnectCloud={handleDisconnectCloud}
        />

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ minHeight: '420px' }}>
          <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <Editor value={text} onChange={setText} />
          </div>
          <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <Preview
              parsedLines={parsedLines}
              text={text}
              metadata={metadata}
              scale={activeScale}
            />
          </div>
        </div>

        <details className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <summary className="px-4 py-3 text-sm font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900">
            ChordPro Quick Reference
          </summary>
          <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
            <div>
              <p className="font-semibold text-gray-800 mb-1">Inline chords</p>
              <code className="block bg-gray-50 rounded p-2 text-xs font-mono">[G]Amazing [D]grace, how [Em]sweet</code>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Section labels</p>
              <code className="block bg-gray-50 rounded p-2 text-xs font-mono"># Verse 1{'\n'}# Chorus</code>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Slash chords</p>
              <code className="block bg-gray-50 rounded p-2 text-xs font-mono">[G/B]walking down the [C/E]road</code>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Plain lyrics (no chords)</p>
              <code className="block bg-gray-50 rounded p-2 text-xs font-mono">Just type the line without brackets</code>
            </div>
          </div>
        </details>
      </main>
    </div>
  );
}
