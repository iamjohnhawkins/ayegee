// ─── CollapsibleSection ───────────────────────────────────────────────────────
// A <tr> that acts as a section header in a hierarchical allocation table.
// Shows a chevron toggle, label, optional count badge, and optional "+ Add" button.
//
// Props:
//   label:      string
//   count:      number|null
//   collapsed:  bool
//   onToggle:   () => void
//   onAdd:      () => void  (omit to hide the + Add button)
//   colSpan:    number      (default 17 — covers all month cols + actions)
//   depth:      0|1|2       (indent level: 0=section, 1=target, 2=parent)
//   bgClass:    string      (Tailwind bg class, default bg-slate-800)
//   textClass:  string      (Tailwind text class, default text-white)

export function CollapsibleSection({
  label, count, collapsed, onToggle, onAdd,
  colSpan = 17, depth = 0, bgClass = 'bg-slate-800', textClass = 'text-white',
}) {
  const indent = depth === 1 ? 'pl-8' : depth === 2 ? 'pl-14' : 'pl-4';
  return (
    <tr className={`${bgClass} select-none`}>
      <td colSpan={colSpan} className={`${indent} pr-4 py-2`}>
        <div className="flex items-center gap-2">
          {/* Chevron */}
          <button
            onClick={onToggle}
            className={`flex items-center gap-2 text-left flex-1 min-w-0 ${textClass}`}
          >
            <svg
              className={`h-4 w-4 shrink-0 transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
            <span className="text-sm font-semibold truncate">{label}</span>
            {count != null && (
              <span className="ml-1 shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                {count}
              </span>
            )}
          </button>
          {/* + Add */}
          {onAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="shrink-0 rounded px-2 py-1 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              + Add
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
