import { useEffect, useRef } from 'react';

// ─── Generic modal ────────────────────────────────────────────────────────────
// Uses the native <dialog> element for accessibility + backdrop dismiss.
export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  // Close on backdrop click
  const handleClick = (e) => {
    if (e.target === ref.current) onClose?.();
  };

  return (
    <dialog
      ref={ref}
      onClick={handleClick}
      onCancel={(e) => { e.preventDefault(); onClose?.(); }}
      className="m-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40 open:flex open:flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}

// ─── Form field helpers ───────────────────────────────────────────────────────
export function FormField({ label, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function FormErrors({ errors }) {
  if (!errors?.length) return null;
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
      {errors.map((e, i) => (
        <p key={i} className="text-sm text-rose-700">{e}</p>
      ))}
    </div>
  );
}

// ─── Reusable button primitives ───────────────────────────────────────────────
export function Btn({ variant = 'primary', disabled, children, ...props }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50';
  const variants = {
    primary:   'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    danger:    'bg-rose-600 text-white hover:bg-rose-700',
  };
  return (
    <button className={`${base} ${variants[variant]}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
