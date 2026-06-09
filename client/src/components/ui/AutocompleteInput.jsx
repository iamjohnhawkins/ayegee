import { useState, useRef, useEffect } from 'react';

// ─── AutocompleteInput ────────────────────────────────────────────────────────
// Props:
//   items:       [{ id, label, sublabel? }]  — the full list to filter
//   value:       string                      — current display text
//   onSelect:    (item) => void              — fired when user picks an item
//   onChange:    (text) => void              — fired on every keystroke
//   placeholder: string
//   disabled:    bool
//
// Key timing note: we use onMouseDown + e.preventDefault() on list items to
// prevent the blur event closing the dropdown before the click registers.
// This is the standard fix for the blur-before-click race condition.

export function AutocompleteInput({ items = [], value = '', onSelect, onChange, placeholder = 'Search…', disabled = false, className = '' }) {
  const [open, setOpen]   = useState(false);
  const inputRef          = useRef(null);

  const filtered = value.trim()
    ? items.filter(i => i.label.toLowerCase().includes(value.trim().toLowerCase()))
    : items;

  const handleSelect = (item) => {
    onSelect(item);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { onChange?.(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map(item => (
            <li
              key={item.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
              className="cursor-pointer px-3 py-2 hover:bg-indigo-50"
            >
              <p className="text-sm text-slate-800">{item.label}</p>
              {item.sublabel && <p className="text-xs text-slate-400">{item.sublabel}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
