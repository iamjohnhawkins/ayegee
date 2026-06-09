// ─── Simple CRUD data table ───────────────────────────────────────────────────
// Props:
//   columns: [{ key, label, className?, render? }]
//   rows:    array of data objects
//   onEdit:  (row) => void
//   onDelete:(row) => void
//   loading: bool
//   emptyMessage: string

import { DeleteButton } from '../ui/DeleteButton';

export function DataTable({ columns, rows, onEdit, onDelete, loading, emptyMessage = 'No records yet.' }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={`border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.className ?? ''}`}
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 w-24 text-right">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                className="px-4 py-10 text-center text-sm text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i} className="group border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 text-sm text-slate-700 ${col.className ?? ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <DeleteButton onDelete={() => onDelete(row)} />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
