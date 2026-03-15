import { transposeText } from '../utils/transpose';
import { exportToPdf } from '../utils/pdfExport';
import { useState } from 'react';

export default function Toolbar({ text, onChange, metadata }) {
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
      await exportToPdf(metadata, text);
    } finally {
      setExporting(false);
    }
  }

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
