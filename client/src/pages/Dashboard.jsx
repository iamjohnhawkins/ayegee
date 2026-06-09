import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/layout/PageHeader';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';

function SummaryCard({ title, value, sub, color = 'indigo' }) {
  const colors = {
    indigo:  'border-indigo-200 bg-indigo-50 text-indigo-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber:   'border-amber-200 bg-amber-50 text-amber-700',
    slate:   'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <div className={`summary-card rounded-xl border p-6 transition-all ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</p>
      <p className="mt-2 text-4xl font-bold">{value ?? '—'}</p>
      {sub && <p className="mt-1 text-sm opacity-60">{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: keys.dashboard.summary(),
    queryFn:  () => api.get('/dashboard/summary'),
  });

  return (
    <>
      <PageHeader title="Dashboard" description="IT Investment Governance overview" />
      <div className="p-8 space-y-8">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <SummaryCard title="Applications"       value={data?.application_count} color="indigo"  />
            <SummaryCard title="Application Groups" value={data?.group_count}        color="emerald" />
            <SummaryCard title="FTEs"               value={data?.fte_count}          color="amber"   />
            <SummaryCard title="CTB Projects"       value={data?.ctb_project_count}  color="slate"   />
          </div>
        )}
      </div>
    </>
  );
}
