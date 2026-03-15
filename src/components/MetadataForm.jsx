export default function MetadataForm({ metadata, onChange }) {
  const field = (key, label, placeholder, extraClass = '') => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="text"
        value={metadata[key] || ''}
        onChange={e => onChange({ ...metadata, [key]: e.target.value })}
        placeholder={placeholder}
        className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white ${extraClass}`}
      />
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {field('title', 'Title', 'Amazing Grace', 'col-span-2 md:col-span-1')}
      {field('artist', 'Artist', 'Traditional')}
      {field('key', 'Key', 'G')}
      {field('tempo', 'Tempo (BPM)', '120')}
    </div>
  );
}
