import { useReducer, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/layout/PageHeader';
import { MonthInputs, MonthHeaders } from '../components/ui/MonthInputs';
import { PersonPicker } from '../components/ui/PersonPicker';
import { DeleteButton } from '../components/ui/DeleteButton';
import { Btn } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast.jsx';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';
import { MONTHS, fmtNum } from '../lib/utils';

function AllocEditRow({ alloc, projectId, ftes, tbhSlots, onSave, onCancel }) {
  const months0 = {}; MONTHS.forEach(m => { months0[m] = alloc?.[m] ?? 0; });
  const [months, setMonths] = useState(months0);
  const [person, setPerson] = useState({ type: alloc?.fte_id ? 'fte' : 'tbh', id: alloc?.fte_id ?? alloc?.tbh_id ?? null, label: alloc?.person_name ?? '' });
  const handleSave = () => { if (!person.id) return; onSave({ ...months, fte_id: person.type === 'fte' ? person.id : null, tbh_id: person.type === 'tbh' ? person.id : null }); };
  return (
    <tr className="bg-sky-50 border-b border-sky-100">
      <td className="px-4 py-2"><PersonPicker ftes={ftes} tbhSlots={tbhSlots} value={person} onChange={setPerson} /></td>
      <td className="w-7 px-1 py-2" />
      <MonthInputs values={months} onChange={setMonths} compact />
      <td className="px-3 py-2"><div className="flex gap-2"><Btn onClick={handleSave}>Save</Btn><Btn variant="secondary" onClick={onCancel}>Cancel</Btn></div></td>
    </tr>
  );
}

export function CTBProjectDetail() {
  const { id } = useParams();
  const showToast = useToast();
  const qc        = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding]       = useState(false);

  const { data: project, isLoading } = useQuery({ queryKey: keys.ctbProjects.detail(id), queryFn: () => api.get(`/ctb-projects/${id}`) });
  const { data: ftes     = [] }      = useQuery({ queryKey: keys.ftes.list(),    queryFn: () => api.get('/ftes') });
  const { data: tbhSlots = [] }      = useQuery({ queryKey: keys.tbh.list(),     queryFn: () => api.get('/tbh') });

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.ctbProjects.detail(id) });

  const allocSaveMut = useMutation({
    mutationFn: ({ allocId, data }) => allocId ? api.put(`/ctb-projects/${id}/allocations/${allocId}`, data) : api.post(`/ctb-projects/${id}/allocations`, data),
    onSuccess: () => { invalidate(); setEditingId(null); setAdding(false); showToast('Allocation saved.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const allocDeleteMut = useMutation({
    mutationFn: (allocId) => api.delete(`/ctb-projects/${id}/allocations/${allocId}`),
    onSuccess: () => { invalidate(); showToast('Allocation deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const NCOLS = 17;

  if (isLoading) return <div className="p-8 text-sm text-slate-400">Loading…</div>;
  if (!project)  return <div className="p-8 text-sm text-rose-500">Project not found.</div>;

  const STATUS_COLORS = { Proposed:'bg-amber-100 text-amber-700', Approved:'bg-emerald-100 text-emerald-700', Rejected:'bg-rose-100 text-rose-700', Cut:'bg-slate-100 text-slate-500' };

  return (
    <>
      <PageHeader
        title={project.title}
        description={`CTB Project · ${project.target_name ?? '—'}`}
      >
        <Link to="/ctb-projects" className="text-sm text-slate-500 hover:text-slate-700">← All Projects</Link>
      </PageHeader>

      <div className="p-8 space-y-6">
        {/* Meta */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><p className="text-xs text-slate-400 mb-1">Status</p><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[project.status] ?? ''}`}>{project.status}</span></div>
          <div><p className="text-xs text-slate-400 mb-1">Priority</p><p className="text-sm font-medium">{project.priority}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">Reason</p><p className="text-sm">{project.reason}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">Lead</p><p className="text-sm">{project.delivery_lead_name ?? '—'}</p></div>
          {project.benefit_eur && <div><p className="text-xs text-slate-400 mb-1">Benefit</p><p className="text-sm">€{Number(project.benefit_eur).toLocaleString()}</p></div>}
          {project.external_cost_eur && <div><p className="text-xs text-slate-400 mb-1">Ext. Cost</p><p className="text-sm">€{Number(project.external_cost_eur).toLocaleString()}</p></div>}
          {project.description && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-slate-400 mb-1">Description</p><p className="text-sm text-slate-600">{project.description}</p></div>}
        </div>

        {/* Allocations table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Allocations</p>
            <Btn onClick={() => setAdding(true)}>+ Add Allocation</Btn>
          </div>
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 min-w-[200px]">Person</th>
                <th className="border-b border-slate-200 bg-slate-50 w-7 px-1 py-3" />
                <MonthHeaders />
                <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adding && (
                <AllocEditRow projectId={id} ftes={ftes} tbhSlots={tbhSlots} onSave={(data) => allocSaveMut.mutate({ allocId: null, data })} onCancel={() => setAdding(false)} />
              )}
              {(project.allocations ?? []).map(alloc => (
                editingId === alloc.id ? (
                  <AllocEditRow key={alloc.id} alloc={alloc} projectId={id} ftes={ftes} tbhSlots={tbhSlots} onSave={(data) => allocSaveMut.mutate({ allocId: alloc.id, data })} onCancel={() => setEditingId(null)} />
                ) : (
                  <tr key={alloc.id} className="border-b border-slate-100 bg-white hover:bg-slate-50 group">
                    <td className="px-4 py-2.5 text-sm text-slate-700">{alloc.person_name}</td>
                    <td className="w-7 px-1 py-2.5" />
                    <MonthInputs values={alloc} readOnly compact />
                    <td className="px-3 py-2.5">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingId(alloc.id)} className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50">Edit</button>
                        <DeleteButton onDelete={() => allocDeleteMut.mutate(alloc.id)} />
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {!adding && !(project.allocations?.length) && (
                <tr><td colSpan={NCOLS} className="px-6 py-8 text-center text-sm text-slate-400">No allocations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
