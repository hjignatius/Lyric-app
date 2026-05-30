import { transposeText } from '../utils/transpose';
import { exportToPdf } from '../utils/pdfExport';
import SongLibrary from './SongLibrary';
import SetlistManager from './SetlistManager';
import { useEffect, useState } from 'react';

export default function Toolbar({
  text,
  onChange,
  metadata,
  currentId,
  onLoadSong,
  onNewSong,
  onSavedId,
  autosavedAt,
  fitToOnePage,
  onToggleFit,
  fitInfo,
  activeScale,
  cloudConnected,
  onConnectCloud,
  onDisconnectCloud,
  onPerform,
}) {
  const [semitones, setSemitones] = useState(0);
  const [useFlats, setUseFlats] = useState(false);
  const [exporting, setExporting] = useState(false);

  function shift(delta) {
    const next = semitones + delta;
    const transposed = transposeText(text, delta, useFlats);
    onChange(transposed);
    setSemitones(next);
  }

  function reset() {
    const restored = transposeText(text, -semitones, useFlats);
    onChange(restored);
    setSemitones(0);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportToPdf(metadata, text, { scale: activeScale });
    } finally {
      setExporting(false);
    }
  }

  // Tooltip + label for the fit-to-page button.
  const fitDisabled = !fitInfo?.needed; // nothing to do — already fits
  const fitTooBig = fitInfo?.needed && !fitInfo?.fits;
  let fitLabel = 'Fit to 1 page';
  if (fitToOnePage) fitLabel = `Fitting · ${Math.round(activeScale * 100)}%`;
  else if (fitInfo?.needed && fitInfo?.fits) fitLabel = `Fit to 1 page (${Math.round(fitInfo.scale * 100)}%)`;
  else if (!fitInfo?.needed) fitLabel = '✓ Fits on 1 page';

  // Briefly show "Saved" after autosave fires, then fade to nothing.
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (!autosavedAt) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 1200);
    return () => clearTimeout(t);
  }, [autosavedAt]);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Transpose control */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transpose</span>
        <button
          onClick={() => shift(-1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-violet-50 hover:border-violet-300 text-gray-700 font-bold transition-colors"
          title="Semitone down"
        >
          −
        </button>
        <span className="text-sm font-mono w-8 text-center text-gray-700">
          {semitones > 0 ? `+${semitones}` : semitones}
        </span>
        <button
          onClick={() => shift(+1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-violet-50 hover:border-violet-300 text-gray-700 font-bold transition-colors"
          title="Semitone up"
        >
          +
        </button>
        {semitones !== 0 && (
          <button
            onClick={reset}
            className="text-xs text-gray-400 hover:text-red-500 ml-1"
            title="Reset transpose"
          >
            reset
          </button>
        )}
      </div>

      {/* Fit-to-one-page toggle */}
      <button
        onClick={onToggleFit}
        disabled={fitDisabled && !fitToOnePage}
        title={
          fitTooBig
            ? 'Song is too long to fit on one page even at minimum scale'
            : fitDisabled
              ? 'Already fits on one page'
              : 'Shrink content so it fits on one PDF page'
        }
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
          fitToOnePage
            ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
            : fitDisabled
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50'
        } ${fitTooBig && fitToOnePage ? 'border-amber-300 bg-amber-50 text-amber-700' : ''}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m-4 12h2a2 2 0 002-2v-2" />
        </svg>
        {fitLabel}
      </button>

      {/* Sharps / Flats toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notation</span>
        <button
          onClick={() => setUseFlats(false)}
          className={`px-2 py-1 text-xs rounded-lg border transition-colors ${!useFlats ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500 hover:border-violet-300'}`}
        >
          # Sharps
        </button>
        <button
          onClick={() => setUseFlats(true)}
          className={`px-2 py-1 text-xs rounded-lg border transition-colors ${useFlats ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500 hover:border-violet-300'}`}
        >
          ♭ Flats
        </button>
      </div>

      <div className="flex-1" />

      {/* Autosave indicator */}
      <span
        className={`text-xs text-gray-400 transition-opacity duration-500 ${showSaved ? 'opacity-100' : 'opacity-0'}`}
        aria-live="polite"
      >
        ✓ Autosaved
      </span>

      {/* pCloud connection */}
      {cloudConnected ? (
        <button
          onClick={() => { if (confirm('Disconnect from pCloud? Songs stay in your pCloud; this device switches back to local storage.')) onDisconnectCloud(); }}
          title="Connected to pCloud — click to disconnect"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          pCloud
        </button>
      ) : (
        <button
          onClick={onConnectCloud}
          title="Sync your songs across devices via pCloud"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 001-9.9A5 5 0 005.1 8.1 4 4 0 003 15z" />
          </svg>
          Connect pCloud
        </button>
      )}

      {/* Song library */}
      <SongLibrary
        text={text}
        metadata={metadata}
        currentId={currentId}
        onLoad={onLoadSong}
        onNew={onNewSong}
        onSavedId={onSavedId}
        cloudConnected={cloudConnected}
      />

      {/* Setlists & performance mode */}
      <SetlistManager onPerform={onPerform} cloudConnected={cloudConnected} />

      {/* Perform the current song */}
      <button
        onClick={() => text?.trim() && onPerform([{ metadata, text }], 0)}
        disabled={!text?.trim()}
        title="Open the current song full-screen for performing"
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Perform
      </button>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={exporting || !text?.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
      >
        {exporting ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Exporting…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </>
        )}
      </button>
    </div>
  );
}
