import { useState, useEffect } from 'react';
import { MONTHS, MONTH_LABELS, fmtNum } from '../../lib/utils';

// ─── MonthInputs ──────────────────────────────────────────────────────────────
// Renders 12 number inputs (Jan–Dec) with:
//   - A "→" button after Jan that copies Jan value to all other months
//   - A running total column
//   - onChange called with the full { jan, feb, … } object on any change
//
// Props:
//   values:    { jan, feb, … }   initial/controlled values
//   onChange:  (values) => void
//   readOnly:  bool              — shows formatted values instead of inputs
//   compact:   bool              — tighter padding for allocation tables

export function MonthInputs({ values = {}, onChange, readOnly = false, compact = false }) {
  const [local, setLocal] = useState(() => {
    const v = {};
    MONTHS.forEach(m => { v[m] = values[m] ?? 0; });
    return v;
  });

  // Sync if parent values change (e.g. reset)
  useEffect(() => {
    const v = {};
    MONTHS.forEach(m => { v[m] = values[m] ?? 0; });
    setLocal(v);
  }, [JSON.stringify(values)]); // eslint-disable-line

  const update = (month, raw) => {
    const n = raw === '' ? 0 : Math.max(0, Number(raw));
    const next = { ...local, [month]: n };
    setLocal(next);
    onChange?.(next);
  };

  const copyJan = () => {
    const jan = local.jan;
    const next = { ...local };
    MONTHS.slice(1).forEach(m => { next[m] = jan; });
    setLocal(next);
    onChange?.(next);
  };

  const total = MONTHS.reduce((s, m) => s + (Number(local[m]) || 0), 0);
  const py    = compact ? 'py-1.5' : 'py-2';

  return (
    <>
      {MONTHS.map((m, i) => (
        <>
          {readOnly ? (
            <td key={m} className={`px-3 ${py} text-right text-xs tabular-nums text-slate-600`}>
              {fmtNum(local[m])}
            </td>
          ) : (
            <td key={m} className={`px-1 ${py}`}>
              <input
                type="number"
                step="0.5"
                min="0"
                value={local[m] || ''}
                onChange={e => update(m, e.target.value)}
                data-month={m}
                className="w-14 rounded border border-slate-200 px-1 py-1 text-xs text-right text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              />
            </td>
          )}
          {/* Copy-Jan button in its own narrow column after Jan */}
          {i === 0 && (
            <td key="copy-jan" className="w-7 px-1 text-center">
              {!readOnly && (
                <button
                  type="button"
                  onClick={copyJan}
                  title="Copy January to all months"
                  className="rounded px-1 py-1 text-[9px] font-semibold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  →
                </button>
              )}
            </td>
          )}
        </>
      ))}
      {/* Total */}
      <td className={`px-3 ${py} text-right text-xs font-semibold tabular-nums text-slate-700`}>
        {fmtNum(total)}
      </td>
    </>
  );
}

// ─── MonthHeaders ─────────────────────────────────────────────────────────────
// Matching header cells for the MonthInputs columns (Jan + spacer + Feb..Dec + Total)
export function MonthHeaders({ label = 'Total' }) {
  return (
    <>
      {MONTH_LABELS.map((lbl, i) => (
        <>
          <th key={lbl} className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 w-14">
            {lbl}
          </th>
          {i === 0 && <th key="spacer" className="border-b border-slate-200 bg-slate-50 w-7 px-1 py-3" />}
        </>
      ))}
      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 w-16">
        {label}
      </th>
    </>
  );
}
