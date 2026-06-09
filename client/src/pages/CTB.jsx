import { useReducer, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/layout/PageHeader';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { MonthInputs, MonthHeaders } from '../components/ui/MonthInputs';
import { PersonPicker } from '../components/ui/PersonPicker';
import { AutocompleteInput } from '../components/ui/AutocompleteInput';
import { DeleteButton } from '../components/ui/DeleteButton';
import { Btn } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast.jsx';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';
import { MONTHS, fmtNum } from '../lib/utils';

const init = { collapsedSections: new Set(), collapsedTargets: new Set(), editingId: null, addingTo: null };
function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SECTION': { const s = new Set(state.collapsedSections); s.has(action.key) ? s.delete(action.key) : s.add(action.key); return { ...state, collapsedSections: s }; }
    case 'TOGGLE_TARGET':  { const s = new Set(state.collapsedTargets);  s.has(action.key) ? s.delete(action.key) : s.add(action.key); return { ...state, collapsedTargets: s }; }
    case 'EDIT':    return { ...state, editingId: action.id, addingTo: null };
    case 'ADD':     return { ...state, addingTo: action.key, editingId: null };
    case 'CANCEL':  return { ...state, editingId: null, addingTo: null };
    default:        return state;
  }
}

function AllocEditRow({ ctbId, alloc, ftes, tbhSlots, onSave, onCancel }) {
  const months0 = {}; MONTHS.forEach(m => { months0[m] = alloc?.[m] ?? 0; });
  const [months, setMonths] = useState(months0);
  const [person, setPerson] = useState({ type: alloc?.fte_id ? 'fte' : 'tbh', id: alloc?.fte_id ?? alloc?.tbh_id ?? null, label: alloc?.person_name ?? '' });
  const [errors, setErrors] = useState([]);
  const handleSave = () => {
    if (!person.id) { setErrors(['Please select an FTE or TBH']); return; }
    onSave({ ...months, fte_id: person.type === 'fte' ? person.id : null, tbh_id: person.type === 'tbh' ? person.id : null });
  };
  return (
    <tr className="bg-sky-50 border-b border-sky-100">
      <td className="px-4 py-2 pl-12">
        {errors.length > 0 && <p className="text-xs text-rose-600 mb-1">{errors[0]}</p>}
        <PersonPicker ftes={ftes} tbhSlots={tbhSlots} value={person} onChange={setPerson} />
      </td>
      <td className="w-7 px-1 py-2" />
      <MonthInputs values={months} onChange={setMonths} compact />
      <td className="px-3 py-2"><div className="flex gap-2"><Btn onClick={handleSave}>Save</Btn><Btn variant="secondary" onClick={onCancel}>Cancel</Btn></div></td>
    </tr>
  );
}

export function CTB() {
  const showToast = useToast();
  const qc        = useQueryClient();
  const [state, dispatch] = useReducer(reducer, init);
  const [addTarget, setAddTarget] = useState({ text:'', id: null, groupId: null });
  const year = new Date().getFullYear();

  const { data: ctbData = [], isLoading } = useQuery({ queryKey: keys.ctb.list(),     queryFn: () => api.get('/ctb') });
  const { data: targets  = [] }           = useQuery({ queryKey: keys.ctb.targets(),  queryFn: () => api.get('/ctb/targets') });
  const { data: ftes     = [] }           = useQuery({ queryKey: keys.ftes.list(),    queryFn: () => api.get('/ftes') });
  const { data: tbhSlots = [] }           = useQuery({ queryKey: keys.tbh.list(),     queryFn: () => api.get('/tbh') });

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.ctb.list() });

  const allocSaveMut = useMutation({
    mutationFn: ({ ctbId, allocId, data }) => allocId ? api.put(`/ctb/${ctbId}/allocations/${allocId}`, data) : api.post(`/ctb/${ctbId}/allocations`, data),
    onSuccess: () => { invalidate(); dispatch({ type:'CANCEL' }); showToast('Allocation saved.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const allocDeleteMut = useMutation({
    mutationFn: ({ ctbId, allocId }) => api.delete(`/ctb/${ctbId}/allocations/${allocId}`),
    onSuccess: () => { invalidate(); showToast('Allocation deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  // Auto-create CTB record for a target, then add allocation
  const addCtbAndAlloc = async (targetItem) => {
    const existing = (ctbData || []).find(c => c.application_id === (targetItem._type === 'application' ? targetItem.id : null) && c.application_group_id === (targetItem._type === 'group' ? targetItem.id : null));
    if (existing) { dispatch({ type:'ADD', key: `ctb:${existing.id}` }); return; }
    try {
      const body = { year, application_id: targetItem._type === 'application' ? targetItem.id : null, application_group_id: targetItem._type === 'group' ? targetItem.id : null };
      const newCtb = await api.post('/ctb', body);
      await invalidate();
      dispatch({ type:'ADD', key: `ctb:${newCtb.id}` });
    } catch (e) { showToast(e.errors?.[0] ?? e.message, 'error'); }
  };

  const targetItems = targets.map(t => ({ id: t.id, label: t.name, sublabel: t.type, _type: t.type }));

  const sections = {};
  (ctbData || []).forEach(ctb => {
    const sectionKey = ctb.application_id ? 'application' : 'group';
    const targetKey  = ctb.application_id ? `app:${ctb.application_id}` : `grp:${ctb.application_group_id}`;
    if (!sections[sectionKey]) sections[sectionKey] = {};
    if (!sections[sectionKey][targetKey]) sections[sectionKey][targetKey] = { name: ctb.target_name ?? '(Unknown)', ctbs: [] };
    sections[sectionKey][targetKey].ctbs.push(ctb);
  });

  const NCOLS = 17;

  if (isLoading) return <><PageHeader title="Baseline CTB" /><div className="p-8 text-sm text-slate-400">Loading…</div></>;

  return (
    <>
      <PageHeader title="Baseline CTB" description={`Baseline capacity to build — ${year}`}>
        <div className="flex items-center gap-2">
          <AutocompleteInput
            items={targetItems}
            value={addTarget.text}
            onChange={(t) => setAddTarget({ text: t, id: null, groupId: null })}
            onSelect={(item) => { setAddTarget({ text: item.label, id: item._type === 'application' ? item.id : null, groupId: item._type === 'group' ? item.id : null, _item: item }); }}
            placeholder="Add target…"
            className="w-52"
          />
          <Btn onClick={() => addTarget._item && addCtbAndAlloc(addTarget._item)} disabled={!addTarget._item}>
            + Add Allocation
          </Btn>
        </div>
      </PageHeader>

      <div className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
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
              {Object.entries(sections).map(([sectionKey, tgts]) => {
                const secCollapsed = state.collapsedSections.has(sectionKey);
                return (
                  <>
                    <CollapsibleSection key={`sec-${sectionKey}`} label={sectionKey === 'application' ? 'Applications' : 'Groups'} count={Object.keys(tgts).length} collapsed={secCollapsed} onToggle={() => dispatch({ type:'TOGGLE_SECTION', key: sectionKey })} colSpan={NCOLS} bgClass="bg-slate-800" />
                    {!secCollapsed && Object.entries(tgts).map(([targetKey, { name, ctbs }]) => {
                      const tgtCollapsed = state.collapsedTargets.has(targetKey);
                      return (
                        <>
                          <CollapsibleSection key={`tgt-${targetKey}`} label={name} count={ctbs.reduce((s, c) => s + (c.allocations?.length ?? 0), 0)} collapsed={tgtCollapsed} onToggle={() => dispatch({ type:'TOGGLE_TARGET', key: targetKey })} colSpan={NCOLS} depth={1} bgClass="bg-slate-700" onAdd={() => ctbs[0] && dispatch({ type:'ADD', key: `ctb:${ctbs[0].id}` })} />
                          {!tgtCollapsed && ctbs.map(ctb => (
                            <>
                              {state.addingTo === `ctb:${ctb.id}` && (
                                <AllocEditRow key={`add-${ctb.id}`} ctbId={ctb.id} ftes={ftes} tbhSlots={tbhSlots} onSave={(data) => allocSaveMut.mutate({ ctbId: ctb.id, allocId: null, data })} onCancel={() => dispatch({ type:'CANCEL' })} />
                              )}
                              {(ctb.allocations ?? []).map(alloc => (
                                state.editingId === `alloc:${alloc.id}` ? (
                                  <AllocEditRow key={`edit-${alloc.id}`} ctbId={ctb.id} alloc={alloc} ftes={ftes} tbhSlots={tbhSlots} onSave={(data) => allocSaveMut.mutate({ ctbId: ctb.id, allocId: alloc.id, data })} onCancel={() => dispatch({ type:'CANCEL' })} />
                                ) : (
                                  <tr key={alloc.id} className="border-b border-slate-100 bg-white hover:bg-slate-50 group">
                                    <td className="px-4 py-2.5 pl-12 text-sm text-slate-700">{alloc.person_name}</td>
                                    <td className="w-7 px-1 py-2.5" />
                                    <MonthInputs values={alloc} readOnly compact />
                                    <td className="px-3 py-2.5">
                                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => dispatch({ type:'EDIT', id: `alloc:${alloc.id}` })} className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50">Edit</button>
                                        <DeleteButton onDelete={() => allocDeleteMut.mutate({ ctbId: ctb.id, allocId: alloc.id })} />
                                      </div>
                                    </td>
                                  </tr>
                                )
                              ))}
                            </>
                          ))}
                        </>
                      );
                    })}
                  </>
                );
              })}
              {Object.keys(sections).length === 0 && (
                <tr><td colSpan={NCOLS} className="px-6 py-10 text-center text-sm text-slate-400">No baseline CTB yet. Select a target above to add one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
