import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/tables/DataTable';
import { Modal, FormField, FormErrors, Btn } from '../components/ui/Modal';
import { AutocompleteInput } from '../components/ui/AutocompleteInput';
import { useToast } from '../hooks/useToast.jsx';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';

const STATUSES  = ['Proposed','Approved','Rejected','Cut'];
const REASONS   = ['Regulatory','Revenue Protection','Revenue Generation','Cost Reduction'];
const PRIORITIES= ['High','Medium','Low'];
const EMPTY = { title:'', description:'', status:'Proposed', reason:'Regulatory', priority:'Medium', benefit_eur:'', external_cost_eur:'', delivery_lead_id:'', targetText:'', targetId: null, targetGroupId: null, portfolioId: null };

export function CTBProjects() {
  const showToast = useToast();
  const qc        = useQueryClient();
  const [modal, setModal]   = useState(null);
  const [errors, setErrors] = useState([]);
  const [form, setForm]     = useState(EMPTY);

  const { data: projects = [], isLoading } = useQuery({ queryKey: keys.ctbProjects.list(), queryFn: () => api.get('/ctb-projects') });
  const { data: targets  = [] }            = useQuery({ queryKey: keys.ctbProjects.targets(), queryFn: () => api.get('/ctb-projects/targets') });
  const { data: ftes     = [] }            = useQuery({ queryKey: keys.ftes.list(), queryFn: () => api.get('/ftes') });

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.ctbProjects.list() });

  const saveMut = useMutation({
    mutationFn: (data) => modal?.mode === 'edit' ? api.put(`/ctb-projects/${modal.data.id}`, data) : api.post('/ctb-projects', data),
    onSuccess: () => { invalidate(); setModal(null); showToast(modal?.mode === 'edit' ? 'Project updated.' : 'Project created.'); },
    onError:   (e) => setErrors(e.errors ?? [e.message]),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/ctb-projects/${id}`),
    onSuccess: () => { invalidate(); showToast('Project deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const targetItems = targets.map(t => ({ id: t.id, label: t.name, sublabel: t.type, _type: t.type }));

  const openAdd  = () => { setForm(EMPTY); setErrors([]); setModal({ mode:'add' }); };
  const openEdit = (row) => {
    setForm({
      title: row.title, description: row.description ?? '', status: row.status, reason: row.reason ?? '', priority: row.priority ?? 'Medium',
      benefit_eur: row.benefit_eur ?? '', external_cost_eur: row.external_cost_eur ?? '', delivery_lead_id: row.delivery_lead_id ?? '',
      targetText: row.target_name ?? '', targetId: row.application_id ?? null, targetGroupId: row.application_group_id ?? null, portfolioId: row.portfolio_id ?? null,
    });
    setErrors([]);
    setModal({ mode:'edit', data: row });
  };

  const submit = (e) => {
    e.preventDefault();
    setErrors([]);
    saveMut.mutate({
      title: form.title, description: form.description, status: form.status, reason: form.reason, priority: form.priority,
      benefit_eur: form.benefit_eur || null, external_cost_eur: form.external_cost_eur || null,
      delivery_lead_id: form.delivery_lead_id || null,
      application_id: form.targetId, application_group_id: form.targetGroupId, portfolio_id: form.portfolioId,
    });
  };

  const f = (k) => e => setForm(p => ({...p, [k]: e.target.value}));

  const STATUS_COLORS = { Proposed:'bg-amber-100 text-amber-700', Approved:'bg-emerald-100 text-emerald-700', Rejected:'bg-rose-100 text-rose-700', Cut:'bg-slate-100 text-slate-500' };
  const PRIORITY_COLORS = { High:'text-rose-600', Medium:'text-amber-600', Low:'text-slate-500' };

  const columns = [
    { key:'title',  label:'Title', render: r => <Link to={`/ctb-projects/${r.id}`} className="font-medium text-indigo-600 hover:underline">{r.title}</Link> },
    { key:'target', label:'Target', render: r => r.target_name ?? '—' },
    { key:'status', label:'Status', render: r => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[r.status] ?? ''}`}>{r.status}</span> },
    { key:'priority', label:'Priority', render: r => <span className={`text-xs font-semibold ${PRIORITY_COLORS[r.priority] ?? ''}`}>{r.priority}</span> },
    { key:'lead',  label:'Lead', render: r => r.delivery_lead_name ?? '—' },
    { key:'benefit', label:'Benefit (€)', className:'text-right', render: r => r.benefit_eur ? `€${Number(r.benefit_eur).toLocaleString()}` : '—' },
  ];

  return (
    <>
      <PageHeader title="CTB Projects" description="Change the bank projects">
        <Btn onClick={openAdd}>+ Add Project</Btn>
      </PageHeader>

      <div className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <DataTable columns={columns} rows={projects} loading={isLoading} onEdit={openEdit} onDelete={r => deleteMut.mutate(r.id)} emptyMessage="No CTB projects yet." />
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Project' : 'Add Project'}
        footer={<><Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn><Btn onClick={submit} disabled={saveMut.isPending}>{saveMut.isPending ? 'Saving…' : 'Save'}</Btn></>}>
        <form onSubmit={submit} className="space-y-4">
          <FormErrors errors={errors} />
          <FormField label="Title *">
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.title} onChange={f('title')} required />
          </FormField>
          <FormField label="Target (application / group / portfolio) *">
            <AutocompleteInput items={targetItems} value={form.targetText}
              onChange={(t) => setForm(p => ({...p, targetText: t, targetId: null, targetGroupId: null, portfolioId: null}))}
              onSelect={(item) => setForm(p => ({...p, targetText: item.label, targetId: item._type==='application'?item.id:null, targetGroupId: item._type==='group'?item.id:null, portfolioId: item._type==='portfolio'?item.id:null}))}
              placeholder="Search…" className="w-full" />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Status">
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.status} onChange={f('status')}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            </FormField>
            <FormField label="Reason">
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.reason} onChange={f('reason')}>{REASONS.map(r=><option key={r}>{r}</option>)}</select>
            </FormField>
            <FormField label="Priority">
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.priority} onChange={f('priority')}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Benefit (€)">
              <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.benefit_eur} onChange={f('benefit_eur')} />
            </FormField>
            <FormField label="External Cost (€)">
              <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.external_cost_eur} onChange={f('external_cost_eur')} />
            </FormField>
          </div>
          <FormField label="Delivery Lead">
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.delivery_lead_id} onChange={f('delivery_lead_id')}>
              <option value="">— None —</option>
              {ftes.map(fte => <option key={fte.id} value={fte.id}>{fte.first_name} {fte.last_name}</option>)}
            </select>
          </FormField>
          <FormField label="Description">
            <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none" rows={3} value={form.description} onChange={f('description')} />
          </FormField>
        </form>
      </Modal>
    </>
  );
}
