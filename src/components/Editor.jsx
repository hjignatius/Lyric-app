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

export default function Editor({ value, onChange }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-xl">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ChordPro Editor</span>
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
      <textarea
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
