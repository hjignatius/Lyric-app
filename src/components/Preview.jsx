import { parseChordPro } from '../utils/chordPro';

function ChordLine({ segments }) {
  return (
    <div className="mb-1">
      {/* Chords row */}
      <div className="flex flex-wrap leading-none">
        {segments.map((seg, i) => {
          const chordLen = (seg.chord?.length || 0) * 9 + 8;
          const textLen = (seg.text?.length || 0) * 8;
          const width = Math.max(chordLen, textLen, 16);
          return (
            <span
              key={i}
              className="inline-block text-violet-600 font-bold text-sm leading-tight"
              style={{ minWidth: width }}
            >
              {seg.chord || ''}
            </span>
          );
        })}
      </div>
      {/* Lyrics row */}
      <div className="flex flex-wrap leading-snug">
        {segments.map((seg, i) => {
          const chordLen = (seg.chord?.length || 0) * 9 + 8;
          const textLen = (seg.text?.length || 0) * 8;
          const width = Math.max(chordLen, textLen, 16);
          return (
            <span
              key={i}
              className="inline-block text-gray-800 text-base font-mono"
              style={{ minWidth: width }}
            >
              {seg.text || ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function Preview({ text, metadata }) {
  const lines = parseChordPro(text || '');
  const { title, artist, key, tempo } = metadata;

  const isEmpty = !text?.trim();

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-xl">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</span>
      </div>
      <div className="flex-1 overflow-y-auto p-5 bg-white rounded-b-xl font-mono text-sm leading-relaxed">
        {isEmpty ? (
          <p className="text-gray-400 italic text-center mt-12">
            Start typing in the editor to see a preview…
          </p>
        ) : (
          <>
            {/* Song header */}
            {(title || artist) && (
              <div className="mb-5 pb-4 border-b border-gray-200">
                {title && <h2 className="text-xl font-bold text-gray-900 font-sans">{title}</h2>}
                {artist && <p className="text-sm text-gray-500 font-sans">{artist}</p>}
                {(key || tempo) && (
                  <p className="text-xs text-gray-400 font-sans mt-1">
                    {key && <>Key: <strong>{key}</strong></>}
                    {key && tempo && ' · '}
                    {tempo && <>Tempo: <strong>{tempo} BPM</strong></>}
                  </p>
                )}
              </div>
            )}

            {/* Song body */}
            {lines.map((line, i) => {
              if (line.type === 'empty') {
                return <div key={i} className="h-4" />;
              }
              if (line.type === 'comment') {
                return (
                  <p key={i} className="text-violet-500 font-bold text-xs uppercase tracking-widest mt-4 mb-1 font-sans">
                    {line.text}
                  </p>
                );
              }
              if (line.type === 'directive') return null;
              if (line.type === 'chords') {
                return <ChordLine key={i} segments={line.segments} />;
              }
              return (
                <div key={i} className="text-gray-800 text-base font-mono mb-1">
                  {line.segments?.[0]?.text || ''}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
