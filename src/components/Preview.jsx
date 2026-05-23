import { Fragment } from 'react';
import { attachSectionLabels } from '../utils/chordPro';
import { computePageBreaks } from '../utils/pageBreaks';

const BASE_CHORD_PX = 14;
const BASE_LYRIC_PX = 16;
// Label column width in px — mirrors the 40pt PDF column at screen resolution.
const LABEL_COL_PX = 52;

function PageBreak({ pageNumber }) {
  return (
    <div className="flex items-center gap-3 my-4 select-none">
      <div className="flex-1 border-t border-dashed border-violet-300" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full font-sans">
        Page {pageNumber}
      </span>
      <div className="flex-1 border-t border-dashed border-violet-300" />
    </div>
  );
}

function SectionLabel({ text, scale }) {
  if (!text) return null;
  return (
    <span
      className="font-bold font-sans uppercase text-violet-500 leading-none"
      style={{ fontSize: 9 * scale, letterSpacing: '0.05em' }}
    >
      {text}
    </span>
  );
}

function ChordLine({ segments, scale }) {
  const chordPx = BASE_CHORD_PX * scale;
  const lyricPx = BASE_LYRIC_PX * scale;
  return (
    <div className="flex flex-wrap font-mono" style={{ marginBottom: 2 * scale }}>
      {segments.map((seg, i) => (
        <div key={i} className="flex flex-col" style={{ whiteSpace: 'pre' }}>
          <span
            className="text-violet-600 font-bold leading-tight"
            style={{ fontSize: chordPx, height: chordPx * 1.1 }}
          >
            {seg.chord ? seg.chord + ' ' : ' '}
          </span>
          <span className="text-gray-800 leading-snug" style={{ fontSize: lyricPx }}>
            {seg.text || ' '}
          </span>
        </div>
      ))}
    </div>
  );
}

// Wraps every body line in a [label col | content] flex row.
function BodyRow({ label, scale, children }) {
  return (
    <div className="flex items-center">
      <div
        className="flex-shrink-0 flex items-center justify-end"
        style={{ width: LABEL_COL_PX, paddingRight: 5 }}
      >
        <SectionLabel text={label} scale={scale} />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function Preview({ parsedLines, text, metadata, scale = 1 }) {
  const lines = attachSectionLabels(parsedLines);
  const breaks = new Set(computePageBreaks(parsedLines, metadata, scale));
  const { title, artist, key, tempo } = metadata;
  const isEmpty = !text?.trim();
  const lyricPx = BASE_LYRIC_PX * scale;

  // Map original parsedLines index → annotated lines index for page breaks.
  // attachSectionLabels drops comment + their following empty lines, so we
  // track which original indices survived.
  const survivingOriginalIndices = (() => {
    const out = [];
    let pending = false;
    for (let i = 0; i < parsedLines.length; i++) {
      const t = parsedLines[i].type;
      if (t === 'comment') { pending = true; continue; }
      if (t === 'empty' && pending) continue;
      pending = false;
      out.push(i);
    }
    return out;
  })();

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
      <div
        className="flex-1 overflow-y-auto bg-white rounded-b-xl"
        style={{ padding: 20, paddingLeft: 4 }}
      >
        {isEmpty ? (
          <p className="text-gray-400 italic text-center mt-12 font-sans text-sm">
            Start typing in the editor to see a preview…
          </p>
        ) : (
          <>
            {/* Song header — indented to match the content column */}
            {(title || artist) && (
              <div
                className="mb-5 pb-4 border-b border-gray-200"
                style={{ marginLeft: LABEL_COL_PX + 5 }}
              >
                {title && <h2 className="text-xl font-bold text-gray-900 font-sans">{title}</h2>}
                {artist && <p className="text-xs text-gray-500 font-sans">{artist}</p>}
                {(key || tempo) && (
                  <p className="font-sans mt-0.5 text-gray-400" style={{ fontSize: 10 }}>
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
              return lines.map((line, annotatedIdx) => {
                const originalIdx = survivingOriginalIndices[annotatedIdx];
                const breakBefore = breaks.has(originalIdx);
                if (breakBefore) pageNumber++;

                let content;
                if (line.type === 'empty') {
                  content = <div style={{ height: 8 * scale }} />;
                } else if (line.type === 'directive') {
                  return null;
                } else if (line.type === 'chords') {
                  content = <ChordLine segments={line.segments} scale={scale} />;
                } else {
                  content = (
                    <div className="text-gray-800 font-mono" style={{ fontSize: lyricPx, marginBottom: 2 * scale }}>
                      {line.segments?.[0]?.text || ''}
                    </div>
                  );
                }

                return (
                  <Fragment key={annotatedIdx}>
                    {breakBefore && <PageBreak pageNumber={pageNumber} />}
                    <BodyRow label={line.label} scale={scale}>
                      {content}
                    </BodyRow>
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
