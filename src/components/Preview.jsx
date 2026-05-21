import { Fragment } from 'react';
import { computePageBreaks } from '../utils/pageBreaks';

// Default font sizes (px) for the preview body. Multiplied by `scale`
// to implement shrink-to-fit without changing the layout structure.
const BASE_CHORD_PX = 14;
const BASE_LYRIC_PX = 16;

function PageBreak({ pageNumber }) {
  return (
    <div className="flex items-center gap-3 my-4 select-none" aria-label={`Page ${pageNumber} starts here`}>
      <div className="flex-1 border-t border-dashed border-violet-300" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full font-sans">
        Page {pageNumber}
      </span>
      <div className="flex-1 border-t border-dashed border-violet-300" />
    </div>
  );
}

function ChordLine({ segments, scale }) {
  // Each chord+lyric pair is its own vertical column so they share the
  // exact same width and stay perfectly aligned. Monospace on both rows
  // keeps character widths consistent.
  const chordPx = BASE_CHORD_PX * scale;
  const lyricPx = BASE_LYRIC_PX * scale;
  return (
    <div className="flex flex-wrap mb-1 font-mono">
      {segments.map((seg, i) => (
        <div key={i} className="flex flex-col" style={{ whiteSpace: 'pre' }}>
          <span
            className="text-violet-600 font-bold leading-tight"
            style={{ fontSize: chordPx, height: chordPx * 1.1 }}
          >
            {seg.chord ? seg.chord + ' ' : ' '}
          </span>
          <span
            className="text-gray-800 leading-snug"
            style={{ fontSize: lyricPx }}
          >
            {seg.text || ' '}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Preview({ parsedLines, text, metadata, scale = 1 }) {
  const lines = parsedLines;
  const breaks = new Set(computePageBreaks(lines, metadata, scale));
  const { title, artist, key, tempo } = metadata;

  const isEmpty = !text?.trim();
  const lyricPx = BASE_LYRIC_PX * scale;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-xl flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</span>
        {scale < 1 && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            Fit · {Math.round(scale * 100)}%
          </span>
        )}
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
            {(() => {
              let pageNumber = 1;
              return lines.map((line, i) => {
                const breakBefore = breaks.has(i);
                if (breakBefore) pageNumber++;
                const pageBreakEl = breakBefore ? (
                  <PageBreak key={`pb-${i}`} pageNumber={pageNumber} />
                ) : null;

                let lineEl;
                if (line.type === 'empty') {
                  lineEl = <div style={{ height: 16 * scale }} />;
                } else if (line.type === 'comment') {
                  lineEl = (
                    <p
                      className="text-violet-500 font-bold uppercase tracking-widest mt-4 mb-1 font-sans"
                      style={{ fontSize: 12 * scale }}
                    >
                      {line.text}
                    </p>
                  );
                } else if (line.type === 'directive') {
                  lineEl = null;
                } else if (line.type === 'chords') {
                  lineEl = <ChordLine segments={line.segments} scale={scale} />;
                } else {
                  lineEl = (
                    <div className="text-gray-800 font-mono mb-1" style={{ fontSize: lyricPx }}>
                      {line.segments?.[0]?.text || ''}
                    </div>
                  );
                }

                return (
                  <Fragment key={i}>
                    {pageBreakEl}
                    {lineEl}
                  </Fragment>
                );
              });
            })()}
          </>
        )}
      </div>
    </div>
  );
}
