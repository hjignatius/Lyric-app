import { useRef, useState } from 'react';

const RESET_AFTER_MS = 3000; // reset if no tap for 3 seconds
const MIN_TAPS = 2;

function TapTempo({ onBpm }) {
  const tapsRef = useRef([]);
  const timerRef = useRef(null);
  const [display, setDisplay] = useState(null);

  function playMetronome(bpm) {
  const beats = 8;
  const interval = 60 / bpm;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  for (let i = 0; i < beats; i++) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = i === 0 ? 1000 : 800; // accent first beat
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime + i * interval);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * interval + 0.05);
    
    oscillator.start(audioCtx.currentTime + i * interval);
    oscillator.stop(audioCtx.currentTime + i * interval + 0.05);
  }
}

  function handleTap() {
    const now = Date.now();

    // Clear any pending reset timer and set a new one
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      tapsRef.current = [];
      setDisplay(null);
    }, RESET_AFTER_MS);

    tapsRef.current.push(now);
    const taps = tapsRef.current;

    if (taps.length < MIN_TAPS) {
      setDisplay('...');
      return;
    }

    // Average the intervals between consecutive taps
    let totalGap = 0;
    for (let i = 1; i < taps.length; i++) {
      totalGap += taps[i] - taps[i - 1];
    }
    const avgGap = totalGap / (taps.length - 1);
    const bpm = Math.round(60000 / avgGap);

    setDisplay(bpm);
    onBpm(String(bpm));
  }
return (
    <div className="flex gap-2">
      <button
        type="button"
        onPointerDown={handleTap}
        className="self-end px-3 py-2 text-sm font-semibold rounded-lg border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 active:scale-95 transition-all select-none touch-none"
        title="Tap in rhythm to detect BPM"
      >
        {display === null ? 'Tap' : display === '...' ? '...' : `${display} BPM`}
      </button>
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); playMetronome(Number(display || 120)); }}
        onTouchStart={(e) => { e.preventDefault(); playMetronome(Number(display || 120)); }}
        className="self-end px-3 py-2 text-sm font-semibold rounded-lg border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 active:scale-95 transition-all select-none touch-none cursor-pointer"
        title="Preview tempo with audio clicks"
>
  Preview
</button>
    </div>
  );}

export default function MetadataForm({ metadata, onChange }) {
  const field = (key, label, placeholder, extraClass = '') => (
    <div className={`flex flex-col gap-1 ${extraClass}`}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="text"
        value={metadata[key] || ''}
        onChange={e => onChange({ ...metadata, [key]: e.target.value })}
        placeholder={placeholder}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
      />
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {field('title', 'Title', 'Amazing Grace', 'col-span-2 md:col-span-1')}
      {field('artist', 'Artist', 'Traditional')}
      {field('key', 'Key', 'G')}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tempo (BPM)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={metadata.tempo || ''}
            onChange={e => onChange({ ...metadata, tempo: e.target.value })}
            placeholder="120"
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
          <TapTempo onBpm={bpm => onChange({ ...metadata, tempo: bpm })} />
        </div>
      </div>
    </div>
  );
}
