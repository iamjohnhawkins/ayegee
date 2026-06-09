import { useReducer, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { MonthInputs, MonthHeaders } from '../components/ui/MonthInputs';
import { PersonPicker } from '../components/ui/PersonPicker';
import { AutocompleteInput } from '../components/ui/AutocompleteInput';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { DeleteButton } from '../components/ui/DeleteButton';
import { SourceBadge } from '../components/ui/StatusBadge';
import { Btn } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast.jsx';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';
import { MONTHS, MONTH_LABELS, fmtNum, computeNetMonths } from '../lib/utils';

const init = { collapsedSections: new Set(), editingId: null, addingTo: null };
function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SECTION': { const s = new Set(state.collapsedSections); s.has(action.key) ? s.delete(action.key) : s.add(action.key); return { ...state, collapsedSections: s }; }
    case 'EDIT':   return { ...state, editingId: action.id, addingTo: null };
    case 'ADD':    return { ...state, addingTo: action.key, editingId: null };
    case 'CANCEL': return { ...state, editingId: null, addingTo: null };
    default:       return state;
  }
}

function AllocEditRow({ alloc, sourceType, parentId, fteId, ftes, tbhSlots, targets, adcs, ctbProjects, onSave, onCancel }) {
  const months0 = {}; MONTHS.forEach(m => { months0[m] = alloc?.[m] ?? 0; });
  const [months, setMonths] = useState(months0);
  const [parentText, setParentText] = useState(alloc?.parent_name ?? '');
  const [selectedParentId, setSelectedParentId] = useState(alloc?.parent_id ?? parentId);
  const [errors, setErrors] = useState([]);

  // For ADC: pick from unallocated ADCs. For baseline_ctb: pick target. For ctb_project: pick project.
  const parentItems = sourceType === 'adc'
    ? (adcs || []).map(a => ({ id: a.id, label: a.title, sublabel: a.target_name }))
    : sourceType === 'baseline_ctb'
    ? (targets || []).map(t => ({ id: t.id, label: t.name, sublabel: t.type }))
    : (ctbProjects || []).map(p => ({ id: p.id, label: p.title, sublabel: p.target_name }));

  const handleSave = async () => {
    if (!selectedParentId) { setErrors(['Please select a parent']); return; }
    setErrors([]);
    onSave({ parentId: selectedParentId, months, fteId });
  };

  const NCOLS = 17;
  return (
    <tr className="bg-sky-50 border-b border-sky-100">
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <SourceBadge type={sourceType} />
          <AutocompleteInput items={parentItems} value={parentText}
            onChange={(t) => { setParentText(t); setSelectedParentId(null); }}
            onSelect={(item) => { setParentText(item.label); setSelectedParentId(item.id); }}
            placeholder="Select…" className="flex-1" />
        </div>
        {errors.length > 0 && <p className="text-xs text-rose-600 mt-1">{errors[0]}</p>}
      </td>
      <td className="w-7 px-1 py-2" />
      <MonthInputs values={months} onChange={setMonths} compact />
      <td className="px-3 py-2"><div className="flex gap-2"><Btn onClick={handleSave}>Save</Btn><Btn variant="secondary" onClick={onCancel}>Cancel</Btn></div></td>
    </tr>
  );
}

const SECTIONS = [
  { key:'adc',          label:'ADC',          bgClass:'bg-slate-800' },
  { key:'baseline_ctb', label:'Baseline CTB',  bgClass:'bg-slate-700' },
  { key:'ctb_project',  label:'CTB Projects',  bgClass:'bg-slate-600' },
];

export function FTEAllocation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fteId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  const [fteQuery, setFteQuery] = useState('');
  const showToast = useToast();
  const qc        = useQueryClient();
  const [state, dispatch] = useReducer(reducer, init);

  const { data: allFtes = [] } = useQuery({ queryKey: keys.ftes.list(), queryFn: () => api.get('/ftes') });
  const { data: allocData }    = useQuery({ queryKey: keys.fteAlloc.detail(fteId), queryFn: () => api.get(`/fte-allocations/${fteId}`), enabled: !!fteId });
  const { data: adcTargets = [] }  = useQuery({ queryKey: keys.adcs.targets(),          queryFn: () => api.get('/adcs/targets') });
  const { data: adcs = [] }        = useQuery({ queryKey: keys.adcs.list(),              queryFn: () => api.get('/adcs') });
  const { data: ctbTargets = [] }  = useQuery({ queryKey: keys.ctb.targets(),            queryFn: () => api.get('/ctb/targets') });
  const { data: ctbProjects = [] } = useQuery({ queryKey: keys.ctbProjects.list(),       queryFn: () => api.get('/ctb-projects') });

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.fteAlloc.detail(fteId) });

  const saveMut = useMutation({
    mutationFn: async ({ sourceType, parentId, allocId, months, fteId }) => {
      const body = { ...months, fte_id: fteId };
      if (sourceType === 'adc')
        return allocId ? api.put(`/adcs/${parentId}/allocations/${allocId}`, body) : api.post(`/adcs/${parentId}/allocations`, body);
      if (sourceType === 'baseline_ctb') {
        // auto-create baseline CTB if needed
        const existing = (allocData?.baseline_ctb ?? []).find(r => r.parent_id === parentId);
        const ctbId = existing ? existing.parent_id : (await api.post('/ctb', { year: new Date().getFullYear(), application_id: null, application_group_id: parentId })).id;
        return allocId ? api.put(`/ctb/${ctbId}/allocations/${allocId}`, body) : api.post(`/ctb/${ctbId}/allocations`, body);
      }
      return allocId ? api.put(`/ctb-projects/${parentId}/allocations/${allocId}`, body) : api.post(`/ctb-projects/${parentId}/allocations`, body);
    },
    onSuccess: () => { invalidate(); dispatch({ type:'CANCEL' }); showToast('Allocation saved.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: ({ sourceType, parentId, allocId }) => {
      if (sourceType === 'adc')          return api.delete(`/adcs/${parentId}/allocations/${allocId}`);
      if (sourceType === 'baseline_ctb') return api.delete(`/ctb/${parentId}/allocations/${allocId}`);
      return api.delete(`/ctb-projects/${parentId}/allocations/${allocId}`);
    },
    onSuccess: () => { invalidate(); showToast('Allocation deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const fte  = allocData?.fte;
  const avail = fte?.availability != null ? fte.availability / 100 : null;

  // Grand total row
  const allAdcRows  = allocData?.adc          ?? [];
  const allCtbRows  = allocData?.baseline_ctb ?? [];
  const allProjRows = allocData?.ctb_projects ?? [];

  const adcTotals = {};
  MONTHS.forEach(m => { adcTotals[m] = allAdcRows.reduce((s, r) => s + (Number(r[m]) || 0), 0); });
  const ctbNet    = fteId ? computeNetMonths(fteId, allAdcRows.map(r => ({...r, fte_id: fteId})), allCtbRows.map(r => ({...r, fte_id: fteId})), allProjRows.map(r => ({...r, fte_id: fteId}))) : {};
  const grandTotals = {};
  MONTHS.forEach(m => { grandTotals[m] = adcTotals[m] + (ctbNet[m] ?? 0); });

  const fteItems = allFtes.map(f => ({ id: f.id, label: `${f.first_name} ${f.last_name}`, sublabel: [f.title, f.region].filter(Boolean).join(' · ') }));

  const allocs = {
    adc:          allocData?.adc ?? [],
    baseline_ctb: allocData?.baseline_ctb ?? [],
    ctb_project:  allocData?.ctb_projects ?? [],
  };

  const NCOLS = 17;

  const cellCls = (val) => {
    if (avail === null) return 'px-3 py-2.5 text-right text-xs font-bold tabular-nums bg-slate-900 text-slate-200';
    if (val > avail) return 'px-3 py-2.5 text-right text-xs font-bold tabular-nums bg-rose-600 text-white';
    if (val === avail) return 'px-3 py-2.5 text-right text-xs font-bold tabular-nums bg-emerald-600 text-white';
    return 'px-3 py-2.5 text-right text-xs font-bold tabular-nums bg-blue-600 text-white';
  };

  return (
    <>
      <PageHeader
        title="FTE Allocation"
        description={fte ? `${fte.first_name} ${fte.last_name} · ${fte.title ?? ''} · Availability ${fte.availability ?? '?'}%` : 'Select an FTE to view their allocations'}
      >
        <AutocompleteInput
          items={fteItems}
          value={fteQuery}
          onChange={setFteQuery}
          onSelect={(item) => { setFteQuery(item.label); setSearchParams({ id: item.id }); }}
          placeholder="Select FTE…"
          className="w-56"
        />
      </PageHeader>

      {!fteId ? (
        <div className="flex flex-1 items-center justify-center p-16 text-sm text-slate-400">
          Select an FTE above to view their allocations.
        </div>
      ) : (
        <div className="p-8">
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 min-w-[200px]">Context / Target</th>
                  <th className="border-b border-slate-200 bg-slate-50 w-7 px-1 py-3" />
                  <MonthHeaders />
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map(sec => {
                  const rows = allocs[sec.key] ?? [];
                  const collapsed = state.collapsedSections.has(sec.key);
                  return (
                    <>
                      <CollapsibleSection
                        key={`sec-${sec.key}`}
                        label={sec.label}
                        count={rows.length}
                        collapsed={collapsed}
                        onToggle={() => dispatch({ type:'TOGGLE_SECTION', key: sec.key })}
                        colSpan={NCOLS}
                        bgClass={sec.bgClass}
                        onAdd={() => dispatch({ type:'ADD', key: sec.key })}
                      />

                      {!collapsed && state.addingTo === sec.key && (
                        <AllocEditRow
                          key={`add-${sec.key}`}
                          sourceType={sec.key}
                          fteId={fteId}
                          adcs={adcs}
                          targets={sec.key === 'baseline_ctb' ? ctbTargets : adcTargets}
                          ctbProjects={ctbProjects}
                          onSave={({ parentId, months }) => saveMut.mutate({ sourceType: sec.key, parentId, allocId: null, months, fteId })}
                          onCancel={() => dispatch({ type:'CANCEL' })}
                        />
                      )}

                      {!collapsed && rows.map(alloc => (
                        state.editingId === `${sec.key}:${alloc.alloc_id}` ? (
                          <AllocEditRow
                            key={`edit-${alloc.alloc_id}`}
                            alloc={alloc}
                            sourceType={sec.key}
                            parentId={alloc.parent_id}
                            fteId={fteId}
                            adcs={adcs}
                            targets={sec.key === 'baseline_ctb' ? ctbTargets : adcTargets}
                            ctbProjects={ctbProjects}
                            onSave={({ parentId, months }) => saveMut.mutate({ sourceType: sec.key, parentId: alloc.parent_id, allocId: alloc.alloc_id, months, fteId })}
                            onCancel={() => dispatch({ type:'CANCEL' })}
                          />
                        ) : (
                          <tr key={alloc.alloc_id} className="border-b border-slate-100 bg-white hover:bg-slate-50 group">
                            <td className="px-4 py-2.5 text-sm text-slate-700">
                              <div className="flex items-center gap-2">
                                <SourceBadge type={sec.key} />
                                <span className="font-medium">{alloc.parent_name}</span>
                                {alloc.target_name && alloc.target_name !== alloc.parent_name && (
                                  <span className="text-slate-400">→ {alloc.target_name}</span>
                                )}
                              </div>
                            </td>
                            <td className="w-7 px-1 py-2.5" />
                            <MonthInputs values={alloc} readOnly compact />
                            <td className="px-3 py-2.5">
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => dispatch({ type:'EDIT', id: `${sec.key}:${alloc.alloc_id}` })} className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50">Edit</button>
                                <DeleteButton onDelete={() => deleteMut.mutate({ sourceType: sec.key, parentId: alloc.parent_id, allocId: alloc.alloc_id })} />
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </>
                  );
                })}

                {/* Grand total row */}
                {fteId && (
                  <tr className="bg-slate-900 sticky bottom-0">
                    <td className="px-4 py-2.5 text-xs font-bold text-slate-200 uppercase tracking-wide">Net Total</td>
                    <td className="w-7 px-1 py-2.5 bg-slate-900" />
                    {MONTHS.map((m, i) => (
                      <>
                        <td key={m} className={cellCls(grandTotals[m])} title={avail == null ? '' : grandTotals[m] > avail ? 'Over availability' : grandTotals[m] === avail ? 'Fully allocated' : 'Under allocated'}>
                          {fmtNum(grandTotals[m])}
                        </td>
                        {i === 0 && <td key="spacer" className="w-7 px-1 py-2.5 bg-slate-900" />}
                      </>
                    ))}
                    <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-200 bg-slate-900">
                      {fmtNum(MONTHS.reduce((s, m) => s + (grandTotals[m] || 0), 0))}
                    </td>
                    <td className="px-3 py-2.5 bg-slate-900" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
