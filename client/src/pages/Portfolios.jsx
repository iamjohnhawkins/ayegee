import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/tables/DataTable';
import { Modal, FormField, FormErrors, Btn } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast.jsx';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';

const EMPTY = { title:'', sponsor_first_name:'', sponsor_last_name:'', sponsor_email:'', owner_id:'' };

export function Portfolios() {
  const showToast = useToast();
  const qc        = useQueryClient();
  const [modal, setModal]   = useState(null);
  const [errors, setErrors] = useState([]);
  const [form, setForm]     = useState(EMPTY);

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: keys.portfolios.list(),
    queryFn:  () => api.get('/portfolios'),
  });
  const { data: ftes = [] } = useQuery({
    queryKey: keys.ftes.list(),
    queryFn:  () => api.get('/ftes'),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.portfolios.list() });

  const saveMut = useMutation({
    mutationFn: (data) => modal?.mode === 'edit'
      ? api.put(`/portfolios/${modal.data.id}`, data)
      : api.post('/portfolios', data),
    onSuccess: () => { invalidate(); setModal(null); showToast(modal?.mode === 'edit' ? 'Portfolio updated.' : 'Portfolio created.'); },
    onError:   (e) => setErrors(e.errors ?? [e.message]),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/portfolios/${id}`),
    onSuccess: () => { invalidate(); showToast('Portfolio deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const openAdd  = () => { setForm(EMPTY); setErrors([]); setModal({ mode:'add' }); };
  const openEdit = (row) => {
    setForm({ title: row.title, sponsor_first_name: row.sponsor_first_name ?? '', sponsor_last_name: row.sponsor_last_name ?? '', sponsor_email: row.sponsor_email ?? '', owner_id: row.owner_id ?? '' });
    setErrors([]);
    setModal({ mode:'edit', data: row });
  };
  const submit = (e) => { e.preventDefault(); setErrors([]); saveMut.mutate({ ...form, owner_id: form.owner_id || null }); };
  const f = (k) => e => setForm(p => ({...p, [k]: e.target.value}));

  const columns = [
    { key: 'title',          label: 'Title' },
    { key: 'sponsor',        label: 'Sponsor',  render: r => `${r.sponsor_first_name ?? ''} ${r.sponsor_last_name ?? ''}`.trim() || '—' },
    { key: 'sponsor_email',  label: 'Sponsor Email', className: 'text-xs text-slate-500' },
    { key: 'owner_name',     label: 'Owner',    render: r => r.owner_name ?? <span className="text-slate-300">—</span> },
  ];

  return (
    <>
      <PageHeader title="Portfolios" description="Named delivery portfolios">
        <Btn onClick={openAdd}>+ Add Portfolio</Btn>
      </PageHeader>

      <div className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <DataTable columns={columns} rows={portfolios} loading={isLoading} onEdit={openEdit} onDelete={r => deleteMut.mutate(r.id)} emptyMessage="No portfolios yet." />
        </div>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit Portfolio' : 'Add Portfolio'}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={submit} disabled={saveMut.isPending}>{saveMut.isPending ? 'Saving…' : 'Save'}</Btn>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <FormErrors errors={errors} />
          <FormField label="Title *">
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.title} onChange={f('title')} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sponsor First Name">
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.sponsor_first_name} onChange={f('sponsor_first_name')} />
            </FormField>
            <FormField label="Sponsor Last Name">
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.sponsor_last_name} onChange={f('sponsor_last_name')} />
            </FormField>
          </div>
          <FormField label="Sponsor Email">
            <input type="email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.sponsor_email} onChange={f('sponsor_email')} />
          </FormField>
          <FormField label="Portfolio Owner (FTE)">
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.owner_id} onChange={f('owner_id')}>
              <option value="">— None —</option>
              {ftes.map(fte => <option key={fte.id} value={fte.id}>{fte.first_name} {fte.last_name}</option>)}
            </select>
          </FormField>
        </form>
      </Modal>
    </>
  );
}
