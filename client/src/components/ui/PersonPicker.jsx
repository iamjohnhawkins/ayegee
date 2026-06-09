import { useState } from 'react';
import { AutocompleteInput } from './AutocompleteInput';

// ─── PersonPicker ─────────────────────────────────────────────────────────────
// FTE / TBH toggle + autocomplete search.
// Used in ADC, CTB, CTBProject allocation rows.
//
// Props:
//   ftes:       [{ id, first_name, last_name, title, region }]
//   tbhSlots:   [{ id, label }]
//   value:      { type: 'fte'|'tbh', id: number|null, label: string }
//   onChange:   ({ type, id, label }) => void

export function PersonPicker({ ftes = [], tbhSlots = [], value, onChange }) {
  const [query, setQuery] = useState(value?.label ?? '');

  const type = value?.type ?? 'fte';

  const fteItems = ftes.map(f => ({
    id: f.id,
    label: `${f.first_name} ${f.last_name}`,
    sublabel: [f.title, f.region].filter(Boolean).join(' · '),
  }));

  const tbhItems = tbhSlots.map(t => ({
    id: t.id,
    label: t.label,
  }));

  const items = type === 'fte' ? fteItems : tbhItems;

  const switchType = (newType) => {
    setQuery('');
    onChange({ type: newType, id: null, label: '' });
  };

  const handleSelect = (item) => {
    setQuery(item.label);
    onChange({ type, id: item.id, label: item.label });
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Toggle */}
      <div className="flex rounded border border-slate-200 overflow-hidden shrink-0">
        <button
          type="button"
          onClick={() => switchType('fte')}
          className={`px-2 py-1 text-xs font-medium transition-colors ${
            type === 'fte' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          FTE
        </button>
        <button
          type="button"
          onClick={() => switchType('tbh')}
          className={`px-2 py-1 text-xs font-medium transition-colors ${
            type === 'tbh' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          TBH
        </button>
      </div>
      {/* Autocomplete */}
      <AutocompleteInput
        items={items}
        value={query}
        onChange={(text) => { setQuery(text); onChange({ type, id: null, label: text }); }}
        onSelect={handleSelect}
        placeholder={type === 'fte' ? 'Search FTE…' : 'Search TBH…'}
        className="flex-1 min-w-32"
      />
    </div>
  );
}
