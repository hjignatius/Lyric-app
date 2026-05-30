import { useEffect, useRef, useState, useCallback } from 'react';
import { parseChordPro, attachSectionLabels } from '../utils/chordPro';
import { transposeText } from '../utils/transpose';

// A distraction-free full-screen view for playing a song (or a setlist) live.
// Big chords-over-lyrics, per-song transpose, adjustable text size, auto-scroll,
// a dark/light toggle, and a screen wake-lock so the device won't sleep on stage.

const MIN_FONT = 14;
const MAX_FONT = 48;
const FONT_STEP = 2;
const DEFAULT_FONT = 24;

// Auto-scroll speeds in pixels/second.
const SCROLL_SPEEDS = [12, 24, 40, 64];

function SongBody({ text, semitones, fontPx, dark }) {
  const transposed = transposeText(text, semitones, false);
  const lines = attachSectionLabels(parseChordPro(transposed));
  const chordColor = dark ? '#f0abfc' : '#7c3aed';
  const lyricColor = dark ? '#f3f4f6' : '#1f2937';
  const labelColor = dark ? '#a5b4fc' : '#7c3aed';
  const chordPx = fontPx * 0.85;

  return (
    <div className="font-mono" style={{ color: lyricColor }}>
      {lines.map((line, i) => {
        const label = line.label ? (
          <div
            key={`label-${i}`}
            className="font-sans font-bold uppercase tracking-widest"
            style={{ color: labelColor, fontSize: fontPx * 0.6, marginTop: i === 0 ? 0 : fontPx, marginBottom: fontPx * 0.25 }}
          >
            {line.label}
          </div>
        ) : null;

        if (line.type === 'directive') return label;
        if (line.type === 'empty') {
          return (
            <div key={i}>
              {label}
              <div style={{ height: fontPx * 0.8 }} />
            </div>
          );
        }
        if (line.type === 'chords') {
          return (
            <div key={i}>
              {label}
              <div className="flex flex-wrap" style={{ marginBottom: fontPx * 0.2 }}>
                {line.segments.map((seg, j) => (
                  <div key={j} className="flex flex-col" style={{ whiteSpace: 'pre' }}>
                    <span className="font-bold leading-tight" style={{ color: chordColor, fontSize: chordPx, height: chordPx * 1.2 }}>
                      {seg.chord ? seg.chord + ' ' : ' '}
                    </span>
                    <span className="leading-snug" style={{ fontSize: fontPx }}>
                      {seg.text || ' '}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // plain lyric line
        return (
          <div key={i}>
            {label}
            <div className="leading-snug" style={{ fontSize: fontPx, marginBottom: fontPx * 0.2 }}>
              {line.segments?.[0]?.text || ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PerformanceView({ songs, startIndex = 0, onExit }) {
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, songs.length - 1)));
  const [semitones, setSemitones] = useState(0);
  const [fontPx, setFontPx] = useState(DEFAULT_FONT);
  const [dark, setDark] = useState(true);
  const [scrolling, setScrolling] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const scrollRef = useRef(null);
  const rafRef = useRef(0);

  const song = songs[index];
  const total = songs.length;

  // Jump to a song. Resetting transpose + scroll lives here (not in an effect)
  // so it only happens on a real move, and stays a plain event-handler action.
  const goTo = useCallback((targetIdx) => {
    const clamped = Math.max(0, Math.min(total - 1, targetIdx));
    if (clamped === index) return;
    setSemitones(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setIndex(clamped);
  }, [total, index]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Keyboard shortcuts: arrows/space navigate, +/- size, Esc exits.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { prev(); }
      else if (e.key === 'Escape') { onExit(); }
      else if (e.key === '+' || e.key === '=') { setFontPx(f => Math.min(MAX_FONT, f + FONT_STEP)); }
      else if (e.key === '-' || e.key === '_') { setFontPx(f => Math.max(MIN_FONT, f - FONT_STEP)); }
      else if (e.key === ' ') { e.preventDefault(); setScrolling(s => !s); }
      else return;
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onExit]);

  // Keep the screen awake while performing (best-effort; ignored if unsupported).
  useEffect(() => {
    let lock = null;
    let released = false;
    async function acquire() {
      try {
        if ('wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
      } catch { /* denied or unsupported — fine */ }
    }
    acquire();
    // Re-acquire if the tab was hidden then shown again (browsers auto-release).
    function onVisible() { if (document.visibilityState === 'visible' && !released) acquire(); }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      try { lock?.release(); } catch { /* already gone */ }
    };
  }, []);

  // Auto-scroll loop. Advances scrollTop by speed (px/s) each frame; stops at
  // the bottom. Fractional remainder is carried so slow speeds still move.
  useEffect(() => {
    if (!scrolling) return;
    const el = scrollRef.current;
    if (!el) return;
    let last = performance.now();
    let carry = 0;
    function step(now) {
      const dt = (now - last) / 1000;
      last = now;
      carry += SCROLL_SPEEDS[speedIdx] * dt;
      const whole = Math.floor(carry);
      if (whole > 0) {
        carry -= whole;
        el.scrollTop += whole;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          setScrolling(false);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scrolling, speedIdx, index]);

  const bg = dark ? 'bg-neutral-950' : 'bg-white';
  const barBg = dark ? 'bg-neutral-900/95 border-neutral-800' : 'bg-gray-50/95 border-gray-200';
  const textMuted = dark ? 'text-neutral-400' : 'text-gray-500';
  const btn = `flex items-center justify-center rounded-lg border transition-colors ${
    dark ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
  }`;

  const meta = song?.metadata || {};
  const title = meta.title?.trim() || 'Untitled';

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col ${bg}`}>
      {/* Top bar */}
      <div className={`flex items-center gap-2 px-4 py-2 border-b ${barBg} backdrop-blur`}>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-bold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>
            {title}
            {meta.artist?.trim() && <span className={`ml-2 font-normal ${textMuted}`}>· {meta.artist.trim()}</span>}
          </div>
          <div className={`text-[11px] ${textMuted}`}>
            {total > 1 ? `Song ${index + 1} of ${total}` : 'Single song'}
            {(meta.key?.trim() || meta.tempo) && ' · '}
            {meta.key?.trim() && <>Key {meta.key.trim()}{semitones !== 0 ? ` (${semitones > 0 ? '+' : ''}${semitones})` : ''}</>}
            {meta.key?.trim() && meta.tempo && ' · '}
            {meta.tempo && <>{meta.tempo} BPM</>}
          </div>
        </div>

        {/* Transpose */}
        <div className="flex items-center gap-1">
          <button className={`${btn} w-8 h-8 text-lg font-bold`} onClick={() => setSemitones(s => s - 1)} title="Transpose down">−</button>
          <span className={`text-xs font-mono w-7 text-center ${textMuted}`}>{semitones > 0 ? `+${semitones}` : semitones}</span>
          <button className={`${btn} w-8 h-8 text-lg font-bold`} onClick={() => setSemitones(s => s + 1)} title="Transpose up">+</button>
        </div>

        {/* Text size */}
        <div className="flex items-center gap-1">
          <button className={`${btn} w-8 h-8`} onClick={() => setFontPx(f => Math.max(MIN_FONT, f - FONT_STEP))} title="Smaller text">A−</button>
          <button className={`${btn} w-8 h-8`} onClick={() => setFontPx(f => Math.min(MAX_FONT, f + FONT_STEP))} title="Bigger text">A+</button>
        </div>

        {/* Auto-scroll */}
        <button
          className={`${btn} h-8 px-2 text-xs font-semibold ${scrolling ? (dark ? 'bg-violet-700 text-white border-violet-700' : 'bg-violet-600 text-white border-violet-600') : ''}`}
          onClick={() => setScrolling(s => !s)}
          title="Toggle auto-scroll (space)"
        >
          {scrolling ? '❚❚' : '▶'} Scroll
        </button>
        <button
          className={`${btn} h-8 px-2 text-xs font-mono`}
          onClick={() => setSpeedIdx(i => (i + 1) % SCROLL_SPEEDS.length)}
          title="Auto-scroll speed"
        >
          {speedIdx + 1}×
        </button>

        {/* Theme toggle */}
        <button className={`${btn} w-8 h-8`} onClick={() => setDark(d => !d)} title="Toggle dark / light">
          {dark ? '☀' : '☾'}
        </button>

        {/* Exit */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold"
          onClick={onExit}
          title="Exit performance mode (Esc)"
        >
          ✕
        </button>
      </div>

      {/* Song content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 md:px-12">
        {song?.missing ? (
          <p className={`text-center mt-16 ${textMuted}`}>
            This song is no longer in your library (it may have been renamed or deleted).
          </p>
        ) : (
          <div className="max-w-4xl mx-auto pb-32">
            <SongBody text={song?.text || ''} semitones={semitones} fontPx={fontPx} dark={dark} />
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className={`flex items-center justify-between gap-3 px-4 py-3 border-t ${barBg}`}>
        <button
          className={`${btn} h-11 px-5 text-sm font-semibold disabled:opacity-30`}
          onClick={prev}
          disabled={index === 0}
        >
          ← Prev
        </button>
        <span className={`text-xs ${textMuted}`}>
          {total > 1 ? `${index + 1} / ${total}` : ''}
        </span>
        <button
          className={`${btn} h-11 px-5 text-sm font-semibold disabled:opacity-30`}
          onClick={next}
          disabled={index === total - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
