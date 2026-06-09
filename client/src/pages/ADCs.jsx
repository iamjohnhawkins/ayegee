import { useReducer, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/layout/PageHeader';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { MonthInputs, MonthHeaders } from '../components/ui/MonthInputs';
import { PersonPicker } from '../components/ui/PersonPicker';
import { AutocompleteInput } from '../components/ui/AutocompleteInput';
import { DeleteButton } from '../components/ui/DeleteButton';
import { Modal, FormField, FormErrors, Btn } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast.jsx';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';
import { MONTHS, fmtNum } from '../lib/utils';

// ─── State reducer ────────────────────────────────────────────────────────────
const init = { collapsedSections: new Set(), collapsedTargets: new Set(), collapsedAdcs: new Set(), editingId: null, addingTo: null };
function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SECTION': {
      const s = new Set(state.collapsedSections);
      s.has(action.key) ? s.delete(action.key) : s.add(action.key);
      return { ...state, collapsedSections: s };
    }
    case 'TOGGLE_TARGET': {
      const s = new Set(state.collapsedTargets);
      s.has(action.key) ? s.delete(action.key) : s.add(action.key);
      return { ...state, collapsedTargets: s };
    }
    case 'TOGGLE_ADC': {
      const s = new Set(state.collapsedAdcs);
      s.has(action.key) ? s.delete(action.key) : s.add(action.key);
      return { ...state, collapsedAdcs: s };
    }
    case 'EDIT':    return { ...state, editingId: action.id, addingTo: null };
    case 'ADD':     return { ...state, addingTo: action.key, editingId: null };
    case 'CANCEL':  return { ...state, editingId: null, addingTo: null };
    default:        return state;
  }
}

// ─── Inline edit row for an ADC ───────────────────────────────────────────────
function ADCEditRow({ adc, targets, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: adc?.title ?? '',
    targetText: adc ? (adc.target_name ?? '') : '',
    targetId: adc?.application_id ?? null,
    targetGroupId: adc?.application_group_id ?? null,
    description: adc?.description ?? '',
  });
  const [errors, setErrors] = useState([]);

  const targetItems = targets.map(t => ({ id: t.id, label: t.name, sublabel: t.type, _type: t.type }));

  const handleSave = () => {
    if (!form.title.trim()) { setErrors(['Title is required']); return; }
    if (!form.targetId && !form.targetGroupId) { setErrors(['Target application or group is required']); return; }
    onSave({
      title: form.title,
      application_id: form.targetId,
      application_group_id: form.targetGroupId,
      description: form.description,
    });
  };

  const COLSPAN = 17;
  return (
    <tr className="bg-indigo-50 border-b border-indigo-100">
      <td colSpan={COLSPAN} className="px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          {errors.length > 0 && <p className="w-full text-xs text-rose-600">{errors.join(', ')}</p>}
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Title *</label>
            <input className="rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400 w-48"
              value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="ADC title" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Target *</label>
            <AutocompleteInput
              items={targetItems}
              value={form.targetText}
              onChange={(text) => setForm(f => ({...f, targetText: text, targetId: null, targetGroupId: null}))}
              onSelect={(item) => setForm(f => ({...f, targetText: item.label, targetId: item._type === 'application' ? item.id : null, targetGroupId: item._type === 'group' ? item.id : null}))}
              placeholder="Application or group…"
              className="w-56"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Description</label>
            <input className="rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400 w-64"
              value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Optional description" />
          </div>
          <div className="flex gap-2">
            <Btn onClick={handleSave}>Save</Btn>
            <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Inline edit row for an allocation ───────────────────────────────────────
function AllocEditRow({ alloc, adcId, ftes, tbhSlots, onSave, onCancel }) {
  const months0 = {};
  MONTHS.forEach(m => { months0[m] = alloc?.[m] ?? 0; });
  const [months, setMonths] = useState(months0);
  const [person, setPerson] = useState({
    type: alloc?.fte_id ? 'fte' : 'tbh',
    id:   alloc?.fte_id ?? alloc?.tbh_id ?? null,
    label: alloc?.person_name ?? '',
  });
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    if (!person.id) { setErrors(['Please select an FTE or TBH']); return; }
    onSave({ ...months, fte_id: person.type === 'fte' ? person.id : null, tbh_id: person.type === 'tbh' ? person.id : null });
  };

  return (
    <tr className="bg-sky-50 border-b border-sky-100">
      <td className="px-4 py-2 pl-16">
        {errors.length > 0 && <p className="text-xs text-rose-600 mb-1">{errors.join(', ')}</p>}
        <PersonPicker ftes={ftes} tbhSlots={tbhSlots} value={person} onChange={setPerson} />
      </td>
      <td className="px-1 py-2 w-7" /> {/* source type col spacer */}
      <MonthInputs values={months} onChange={setMonths} compact />
      <td className="px-3 py-2">
        <div className="flex gap-2">
          <Btn onClick={handleSave}>Save</Btn>
          <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        </div>
      </td>
    </tr>
  );
}

// ─── ADCs page ────────────────────────────────────────────────────────────────
export function ADCs() {
  const showToast = useToast();
  const qc        = useQueryClient();
  const [state, dispatch] = useReducer(reducer, init);
  const year = new Date().getFullYear();

  const { data: adcData = [], isLoading } = useQuery({
    queryKey: keys.adcs.list(),
    queryFn:  () => api.get('/adcs'),
  });
  const { data: targets = [] } = useQuery({
    queryKey: keys.adcs.targets(),
    queryFn:  () => api.get('/adcs/targets'),
  });
  const { data: ftes    = [] } = useQuery({ queryKey: keys.ftes.list(),  queryFn: () => api.get('/ftes') });
  const { data: tbhSlots= [] } = useQuery({ queryKey: keys.tbh.list(),   queryFn: () => api.get('/tbh') });

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.adcs.list() });

  const adcSaveMut = useMutation({
    mutationFn: (data) => state.editingId
      ? api.put(`/adcs/${state.editingId}`, data)
      : api.post('/adcs', data),
    onSuccess: () => { invalidate(); dispatch({ type:'CANCEL' }); showToast(state.editingId ? 'ADC updated.' : 'ADC created.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const adcDeleteMut = useMutation({
    mutationFn: (id) => api.delete(`/adcs/${id}`),
    onSuccess: () => { invalidate(); showToast('ADC deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const allocSaveMut = useMutation({
    mutationFn: ({ adcId, allocId, data }) => allocId
      ? api.put(`/adcs/${adcId}/allocations/${allocId}`, data)
      : api.post(`/adcs/${adcId}/allocations`, data),
    onSuccess: () => { invalidate(); dispatch({ type:'CANCEL' }); showToast('Allocation saved.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const allocDeleteMut = useMutation({
    mutationFn: ({ adcId, allocId }) => api.delete(`/adcs/${adcId}/allocations/${allocId}`),
    onSuccess: () => { invalidate(); showToast('Allocation deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  // ── Group ADCs by section (application vs group) and target ──────────────
  const sections = {};
  (adcData || []).forEach(adc => {
    const sectionKey = adc.application_id ? 'application' : 'group';
    const targetKey  = adc.application_id ? `app:${adc.application_id}` : `grp:${adc.application_group_id}`;
    const targetName = adc.target_name ?? '(Unknown)';
    if (!sections[sectionKey])                     sections[sectionKey] = {};
    if (!sections[sectionKey][targetKey])          sections[sectionKey][targetKey] = { name: targetName, adcs: [] };
    sections[sectionKey][targetKey].adcs.push(adc);
  });

  const NCOLS = 17; // person + spacer + 12 months + copy-jan spacer + total + actions

  if (isLoading) return <><PageHeader title="ADC" /><div className="p-8 text-sm text-slate-400">Loading…</div></>;

  return (
    <>
      <PageHeader title="ADC" description={`Architectural Design Cures — ${year}`}>
        <Btn onClick={() => dispatch({ type:'ADD', key:'new' })}>+ Add ADC</Btn>
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
              {/* Add ADC at top level */}
              {state.addingTo === 'new' && (
                <ADCEditRow
                  targets={targets}
                  onSave={(data) => adcSaveMut.mutate(data)}
                  onCancel={() => dispatch({ type:'CANCEL' })}
                />
              )}

              {Object.entries(sections).map(([sectionKey, targets_]) => {
                const secCollapsed = state.collapsedSections.has(sectionKey);
                const sectionLabel = sectionKey === 'application' ? 'Applications' : 'Groups';
                const totalAdcs    = Object.values(targets_).reduce((s, t) => s + t.adcs.length, 0);

                return (
                  <>
                    {/* Section row */}
                    <CollapsibleSection
                      key={`sec-${sectionKey}`}
                      label={sectionLabel}
                      count={totalAdcs}
                      collapsed={secCollapsed}
                      onToggle={() => dispatch({ type:'TOGGLE_SECTION', key: sectionKey })}
                      colSpan={NCOLS}
                      bgClass="bg-slate-800"
                    />

                    {!secCollapsed && Object.entries(targets_).map(([targetKey, { name: targetName, adcs }]) => {
                      const tgtCollapsed = state.collapsedTargets.has(targetKey);

                      return (
                        <>
                          {/* Target row */}
                          <CollapsibleSection
                            key={`tgt-${targetKey}`}
                            label={targetName}
                            count={adcs.length}
                            collapsed={tgtCollapsed}
                            onToggle={() => dispatch({ type:'TOGGLE_TARGET', key: targetKey })}
                            colSpan={NCOLS}
                            depth={1}
                            bgClass="bg-slate-700"
                            onAdd={() => dispatch({ type:'ADD', key: `target:${targetKey}` })}
                          />

                          {/* Add ADC under target */}
                          {!tgtCollapsed && state.addingTo === `target:${targetKey}` && (
                            <ADCEditRow
                              targets={targets}
                              onSave={(data) => adcSaveMut.mutate(data)}
                              onCancel={() => dispatch({ type:'CANCEL' })}
                            />
                          )}

                          {!tgtCollapsed && adcs.map(adc => {
                            const adcCollapsed = state.collapsedAdcs.has(adc.id);
                            const adcTotal     = MONTHS.reduce((s, m) => s + adc.monthly_totals?.[m] || 0, 0);

                            return (
                              <>
                                {/* ADC header row */}
                                {state.editingId === adc.id ? (
                                  <ADCEditRow
                                    key={`edit-adc-${adc.id}`}
                                    adc={adc}
                                    targets={targets}
                                    onSave={(data) => adcSaveMut.mutate({ ...data })}
                                    onCancel={() => dispatch({ type:'CANCEL' })}
                                  />
                                ) : (
                                  <CollapsibleSection
                                    key={`adc-${adc.id}`}
                                    label={adc.title}
                                    count={(adc.allocations ?? []).length}
                                    collapsed={adcCollapsed}
                                    onToggle={() => dispatch({ type:'TOGGLE_ADC', key: adc.id })}
                                    colSpan={NCOLS}
                                    depth={2}
                                    bgClass="bg-slate-600"
                                    onAdd={() => dispatch({ type:'ADD', key: `adc:${adc.id}` })}
                                  />
                                )}

                                {/* Add allocation under ADC */}
                                {!adcCollapsed && state.addingTo === `adc:${adc.id}` && (
                                  <AllocEditRow
                                    key={`add-alloc-${adc.id}`}
                                    adcId={adc.id}
                                    ftes={ftes}
                                    tbhSlots={tbhSlots}
                                    onSave={(data) => allocSaveMut.mutate({ adcId: adc.id, allocId: null, data })}
                                    onCancel={() => dispatch({ type:'CANCEL' })}
                                  />
                                )}

                                {/* Allocation rows */}
                                {!adcCollapsed && (adc.allocations ?? []).map(alloc => (
                                  state.editingId === `alloc:${alloc.id}` ? (
                                    <AllocEditRow
                                      key={`edit-alloc-${alloc.id}`}
                                      alloc={alloc}
                                      adcId={adc.id}
                                      ftes={ftes}
                                      tbhSlots={tbhSlots}
                                      onSave={(data) => allocSaveMut.mutate({ adcId: adc.id, allocId: alloc.id, data })}
                                      onCancel={() => dispatch({ type:'CANCEL' })}
                                    />
                                  ) : (
                                    <tr key={alloc.id} className="border-b border-slate-100 bg-white hover:bg-slate-50 group">
                                      <td className="px-4 py-2.5 pl-16 text-sm text-slate-700">{alloc.person_name}</td>
                                      <td className="w-7 px-1 py-2.5" />
                                      <MonthInputs values={alloc} readOnly compact />
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => dispatch({ type:'EDIT', id: `alloc:${alloc.id}` })} className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50">Edit</button>
                                          <DeleteButton onDelete={() => allocDeleteMut.mutate({ adcId: adc.id, allocId: alloc.id })} />
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                ))}
                              </>
                            );
                          })}
                        </>
                      );
                    })}
                  </>
                );
              })}

              {Object.keys(sections).length === 0 && (
                <tr><td colSpan={NCOLS} className="px-6 py-10 text-center text-sm text-slate-400">No ADCs yet. Click "+ Add ADC" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
