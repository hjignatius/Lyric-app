import { useMemo, useRef, useState } from 'react';

const EXAMPLE = `# Verse 1
[G]Amazing [D]grace, how [G]sweet the sound
That [G]saved a [C]wretch like [G]me
I [G]once was [D]lost, but [G]now I'm [Em]found
Was [C]blind but [G]now I [D]see

# Chorus
[G]Through many [C]dangers, [G]toils and snares
I have [D]already [G]come
'Twas [G]grace that [C]brought me [G]safe thus far
And [G]grace will [D]lead me [G]home
`;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function Editor({ value, onChange }) {
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const textareaRef = useRef(null);

  const matchCount = useMemo(() => {
    if (!findText) return 0;
    try {
      const re = new RegExp(escapeRegExp(findText), caseSensitive ? 'g' : 'gi');
      return (value.match(re) || []).length;
    } catch {
      return 0;
    }
  }, [value, findText, caseSensitive]);

  function findNext() {
    if (!findText) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const re = new RegExp(escapeRegExp(findText), caseSensitive ? 'g' : 'gi');
    re.lastIndex = ta.selectionEnd ?? 0;
    let m = re.exec(value);
    if (!m) {
      re.lastIndex = 0;
      m = re.exec(value);
    }
    if (m) {
      ta.focus();
      ta.setSelectionRange(m.index, m.index + m[0].length);
    }
  }

  function replaceCurrent() {
    if (!findText) return;
    const ta = textareaRef.current;
    const selStart = ta.selectionStart;
    const selEnd = ta.selectionEnd;
    const selected = value.slice(selStart, selEnd);
    const matches = caseSensitive
      ? selected === findText
      : selected.toLowerCase() === findText.toLowerCase();
    if (selected && matches) {
      const newValue = value.slice(0, selStart) + replaceText + value.slice(selEnd);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(selStart + replaceText.length, selStart + replaceText.length);
        findNext();
      });
    } else {
      findNext();
    }
  }

  function replaceAll() {
    if (!findText) return;
    const re = new RegExp(escapeRegExp(findText), caseSensitive ? 'g' : 'gi');
    onChange(value.replace(re, replaceText));
  }

  function closeFind() {
    setFindOpen(false);
    setFindText('');
    setReplaceText('');
  }

  function onFindKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      findNext();
    } else if (e.key === 'Escape') {
      closeFind();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-xl">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ChordPro Editor</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFindOpen(o => !o)}
            className="text-xs text-violet-600 hover:text-violet-800 font-medium"
          >
            {findOpen ? 'Close' : 'Find & Replace'}
          </button>
          {!value && (
            <button
              onClick={() => onChange(EXAMPLE)}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              Load example
            </button>
          )}
          {value && (
            <button
              onClick={() => onChange('')}
              className="text-xs text-gray-400 hover:text-red-500 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {findOpen && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm">
          <input
            type="text"
            value={findText}
            onChange={e => setFindText(e.target.value)}
            onKeyDown={onFindKeyDown}
            placeholder="Find"
            autoFocus
            className="flex-1 min-w-[7rem] px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
          />
          <input
            type="text"
            value={replaceText}
            onChange={e => setReplaceText(e.target.value)}
            onKeyDown={onFindKeyDown}
            placeholder="Replace with"
            className="flex-1 min-w-[7rem] px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
          />
          <label className="flex items-center gap-1 text-xs text-gray-500 select-none">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={e => setCaseSensitive(e.target.checked)}
            />
            Case
          </label>
          <span className="text-xs text-gray-400 w-16 text-right">
            {findText ? `${matchCount} found` : ''}
          </span>
          <button
            onClick={findNext}
            disabled={!findText}
            className="px-2 py-1 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40"
          >
            Find next
          </button>
          <button
            onClick={replaceCurrent}
            disabled={!findText}
            className="px-2 py-1 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40"
          >
            Replace
          </button>
          <button
            onClick={replaceAll}
            disabled={!findText}
            className="px-2 py-1 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40"
          >
            Replace all
          </button>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        placeholder={`Enter ChordPro text...\n\nExample:\n[G]Amazing [D]grace, how [G]sweet the sound\n\nUse # Verse 1 for section labels`}
        className="flex-1 w-full font-mono text-sm p-4 resize-none focus:outline-none bg-white rounded-b-xl"
        style={{ minHeight: 0 }}
      />
    </div>
  );
}
