// Sticky top bar: page title + description + optional right-side actions
export function PageHeader({ title, description, children }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
