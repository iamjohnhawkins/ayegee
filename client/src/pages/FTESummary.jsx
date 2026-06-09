import { useRef, useLayoutEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';
import { MONTHS, MONTH_LABELS, fmtNum, computeNetMonths } from '../lib/utils';

function cellCls(val, avail) {
  const base = 'h-10 px-3 py-0 align-middle text-right text-xs tabular-nums ';
  if (avail === null || avail === undefined) return base + 'text-slate-500';
  if (val > avail)    return base + 'font-semibold bg-rose-600 text-white';
  if (val === avail)  return base + 'font-semibold bg-emerald-600 text-white';
  return base + 'font-semibold bg-blue-600 text-white';
}

export function FTESummary() {
  const navigate   = useNavigate();
  const [q, setQ]  = useState('');
  const headerRef  = useRef(null);
  const tableRef   = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: keys.fteAlloc.summary(),
    queryFn:  () => api.get('/fte-allocations/summary'),
  });

  // Set sticky top on <th> cells dynamically using ResizeObserver
  useLayoutEffect(() => {
    if (!headerRef.current || !tableRef.current) return;
    const ro = new ResizeObserver(() => {
      const h = headerRef.current?.offsetHeight ?? 0;
      tableRef.current?.style.setProperty('--header-h', h + 'px');
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  const ftes = (data?.ftes ?? []).filter(f => {
    if (!q.trim()) return true;
    const lq = q.toLowerCase();
    return `${f.first_name} ${f.last_name}`.toLowerCase().includes(lq)
        || (f.title ?? '').toLowerCase().includes(lq)
        || (f.region ?? '').toLowerCase().includes(lq);
  });

  return (
    <>
      {/* Sticky combined header — measured by ResizeObserver */}
      <div ref={headerRef} className="sticky top-0 z-20 bg-white">
        <PageHeader title="FTE Summary" description="Net monthly allocation (ADC + net CTB) for all FTEs · click a row to view detail">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter FTEs…" className="w-44 text-sm outline-none bg-transparent placeholder-slate-400" />
          </div>
        </PageHeader>
        {/* Legend */}
        <div className="flex items-center gap-4 border-b border-slate-200 px-8 py-2 bg-white">
          <span className="text-xs text-slate-500">Colour key:</span>
          <span className="inline-flex items-center gap-1.5 text-xs"><span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />Under allocated</span>
          <span className="inline-flex items-center gap-1.5 text-xs"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-600" />Fully allocated</span>
          <span className="inline-flex items-center gap-1.5 text-xs"><span className="inline-block w-3 h-3 rounded-sm bg-rose-600" />Over allocated</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><span className="inline-block w-3 h-3 rounded-sm bg-slate-200" />No availability set</span>
        </div>
      </div>

      <div ref={tableRef} className="overflow-x-auto" style={{ '--header-h': '105px' }}>
        {isLoading && <p className="p-8 text-sm text-slate-400">Loading…</p>}
        {error && <p className="p-8 text-sm text-rose-500">Failed to load data. Please refresh.</p>}
        {data && (
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="border-b-2 border-slate-300 bg-slate-50 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 min-w-[220px] whitespace-nowrap"
                  style={{ position:'sticky', top: 'var(--header-h)', zIndex: 10 }}>
                  FTE
                </th>
                {MONTH_LABELS.map(lbl => (
                  <th key={lbl} className="border-b-2 border-slate-300 bg-slate-50 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 w-14"
                    style={{ position:'sticky', top: 'var(--header-h)', zIndex: 10 }}>
                    {lbl}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ftes.length === 0 ? (
                <tr><td colSpan={13} className="px-6 py-10 text-center text-sm text-slate-400">No FTEs match your filter.</td></tr>
              ) : ftes.map(fte => {
                const avail = fte.availability != null ? fte.availability / 100 : null;
                const net   = computeNetMonths(fte.id, data.adc, data.baseline_ctb, data.ctb_projects);
                const meta  = [fte.title, fte.region].filter(Boolean).join(' · ');
                return (
                  <tr key={fte.id} className="border-b border-slate-100 bg-white cursor-pointer"
                    title="View allocations"
                    onClick={() => navigate(`/fte-allocation?id=${fte.id}`)}>
                    <td className="h-10 px-6 py-0 align-middle bg-white whitespace-nowrap">
                      <span className="font-semibold text-sm text-slate-800">{fte.first_name} {fte.last_name}</span>
                      {meta && <span className="ml-2 text-xs text-slate-400 font-normal">{meta}</span>}
                    </td>
                    {MONTHS.map(m => {
                      const val = net[m];
                      const title = avail === null ? '' : val > avail ? 'Over availability' : val === avail ? 'Fully allocated' : 'Under allocated';
                      return <td key={m} className={cellCls(val, avail)} title={title}>{fmtNum(val)}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
