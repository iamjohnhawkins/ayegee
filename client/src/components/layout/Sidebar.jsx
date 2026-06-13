import { NavLink } from 'react-router-dom';

// ─── Nav item helper ──────────────────────────────────────────────────────────
function NavItem({ to, icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          collapsed ? 'justify-center px-1' : ''
        } ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
      }
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0 h-4 w-4">{icon}</span>
      {!collapsed && <span className="nav-label">{label}</span>}
    </NavLink>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const icons = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm8-3a1 1 0 0 0-.867.5 1 1 0 1 1-1.731-1A3 3 0 0 1 13 10a3.001 3.001 0 0 1-2 2.83V13a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1 1 1 0 1 0 0-2 3 3 0 0 1-3-3zm1 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>
  ),
  applications: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm10 0a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V4zM2 12a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2zm10 0a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2z"/></svg>
  ),
  groups: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5zM5 11a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H5zM11 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V5zM14 11a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1z"/></svg>
  ),
  ftes: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM17 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 0 0-1.5-4.33A5 5 0 0 1 19 16v1h-6.07zM6 11a5 5 0 0 1 5 5v1H1v-1a5 5 0 0 1 5-5z"/></svg>
  ),
  portfolios: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1h2a2 2 0 0 1 2 2v3.57A22.952 22.952 0 0 1 10 13a22.95 22.95 0 0 1-8-1.43V8a2 2 0 0 1 2-2h2zm2-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1H8V5zm1 5a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H10a1 1 0 0 1-1-1z" clipRule="evenodd"/><path d="M2 13.692V16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.308A24.974 24.974 0 0 1 10 15c-2.796 0-5.487-.46-8-1.308z"/></svg>
  ),
  adc: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0 0 10 1.944 11.954 11.954 0 0 0 17.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clipRule="evenodd"/></svg>
  ),
  ctb: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd"/></svg>
  ),
  ctbProjects: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg>
  ),
  fteAllocation: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
  ),
  fteSummary: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
  ),
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar({ collapsed, setCollapsed }) {

  return (
    <>
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-10 flex flex-col overflow-y-auto bg-slate-900 transition-[width] duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 border-b border-slate-700/60 py-5 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold tracking-tight select-none">
            IG
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold leading-tight text-white">IT Investment</p>
              <p className="text-xs font-medium text-indigo-400">Governance</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {!collapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Main</p>}
          <NavItem to="/"               icon={icons.dashboard}     label="Dashboard"          collapsed={collapsed} />

          {!collapsed && <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Manage</p>}
          {collapsed && <div className="my-2 border-t border-slate-700/40" />}
          <NavItem to="/applications"        icon={icons.applications}  label="Applications"       collapsed={collapsed} />
          <NavItem to="/application-groups"  icon={icons.groups}        label="Application Groups" collapsed={collapsed} />
          <NavItem to="/ftes"                icon={icons.ftes}          label="FTEs"               collapsed={collapsed} />
          <NavItem to="/portfolios"          icon={icons.portfolios}    label="Portfolios"         collapsed={collapsed} />
          <NavItem to="/adcs"                icon={icons.adc}           label="ADC"                collapsed={collapsed} />
          <NavItem to="/ctb"                 icon={icons.ctb}           label="Baseline CTB"       collapsed={collapsed} />
          <NavItem to="/ctb-projects"        icon={icons.ctbProjects}   label="CTB Projects"       collapsed={collapsed} />

          {!collapsed && <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Visualise</p>}
          {collapsed && <div className="my-2 border-t border-slate-700/40" />}
          <NavItem to="/fte-allocation" icon={icons.fteAllocation} label="FTE Allocation" collapsed={collapsed} />
          <NavItem to="/fte-summary"    icon={icons.fteSummary}    label="FTE Summary"    collapsed={collapsed} />
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-slate-700/60 px-5 py-4">
            <p className="text-xs text-slate-500">IT Division · Internal Use Only</p>
            <p className="mt-0.5 text-xs text-slate-600">v2.0</p>
          </div>
        )}
      </aside>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title="Toggle sidebar"
        style={{ left: collapsed ? '3.25rem' : '15.25rem' }}
        className="fixed top-16 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-slate-300 shadow hover:bg-slate-600 transition-[left] duration-200"
      >
        <span className={`block h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>
          {icons.chevronLeft}
        </span>
      </button>
    </>
  );
}
