import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/tables/DataTable';
import { Modal, FormField, FormErrors, Btn } from '../components/ui/Modal';
import { TitleBadge } from '../components/ui/StatusBadge';
import { BulkUploadModal } from '../components/ui/BulkUploadModal';
import { useToast } from '../hooks/useToast.jsx';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';

const REGIONS = ['London','Birmingham','Pune','Bangalore','Cary','New York','Frankfurt','Berlin'];
const TITLES  = ['Associate','AVP','VP','D','MD'];
const EMPTY   = { first_name:'', last_name:'', email:'', title:'AVP', region:'London', availability:100 };

export function FTEs() {
  const showToast = useToast();
  const qc        = useQueryClient();
  const [modal, setModal]   = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [errors, setErrors] = useState([]);
  const [form, setForm]     = useState(EMPTY);

  const { data: ftes = [], isLoading } = useQuery({
    queryKey: keys.ftes.list(),
    queryFn:  () => api.get('/ftes'),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.ftes.list() });

  const saveMut = useMutation({
    mutationFn: (data) => modal?.mode === 'edit'
      ? api.put(`/ftes/${modal.data.id}`, data)
      : api.post('/ftes', data),
    onSuccess: () => { invalidate(); setModal(null); showToast(modal?.mode === 'edit' ? 'FTE updated.' : 'FTE created.'); },
    onError:   (e) => setErrors(e.errors ?? [e.message]),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/ftes/${id}`),
    onSuccess: () => { invalidate(); showToast('FTE deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const openAdd  = () => { setForm(EMPTY); setErrors([]); setModal({ mode:'add' }); };
  const openEdit = (row) => {
    setForm({ first_name: row.first_name, last_name: row.last_name, email: row.email, title: row.title, region: row.region, availability: row.availability });
    setErrors([]);
    setModal({ mode:'edit', data: row });
  };
  const submit = (e) => { e.preventDefault(); setErrors([]); saveMut.mutate({ ...form, availability: Number(form.availability) }); };
  const f = (k) => e => setForm(p => ({...p, [k]: e.target.value}));

  const columns = [
    { key: 'name',   label: 'Name',   render: r => `${r.first_name} ${r.last_name}` },
    { key: 'email',  label: 'Email',  className: 'text-slate-500 text-xs' },
    { key: 'title',  label: 'Title',  render: r => <TitleBadge title={r.title} /> },
    { key: 'region', label: 'Region', className: 'text-slate-500' },
    { key: 'availability', label: 'Avail %', className: 'text-right w-20', render: r => `${r.availability}%` },
    { key: 'alloc',  label: '',       render: r => (
        <Link to={`/fte-allocation?id=${r.id}`} className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline" title="View allocations">
          Allocations →
        </Link>
      )
    },
  ];

  return (
    <>
      <PageHeader title="FTEs" description="Full-time equivalent staff">
        <Btn variant="secondary" onClick={() => setBulkOpen(true)}>Bulk Upload</Btn>
        <Btn onClick={openAdd}>+ Add FTE</Btn>
      </PageHeader>

      <div className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <DataTable columns={columns} rows={ftes} loading={isLoading} onEdit={openEdit} onDelete={r => deleteMut.mutate(r.id)} emptyMessage="No FTEs yet." />
        </div>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit FTE' : 'Add FTE'}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={submit} disabled={saveMut.isPending}>{saveMut.isPending ? 'Saving…' : 'Save'}</Btn>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <FormErrors errors={errors} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name *">
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.first_name} onChange={f('first_name')} required />
            </FormField>
            <FormField label="Last Name *">
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.last_name} onChange={f('last_name')} required />
            </FormField>
          </div>
          <FormField label="Email *">
            <input type="email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.email} onChange={f('email')} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Title">
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.title} onChange={f('title')}>
                {TITLES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Region">
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" value={form.region} onChange={f('region')}>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label={`Availability: ${form.availability}%`}>
            <input type="range" min="1" max="100" className="w-full accent-indigo-600" value={form.availability} onChange={f('availability')} />
          </FormField>
        </form>
      </Modal>

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} uploadPath="/ftes/bulk-upload" samplePath="/ftes/sample" entityLabel="FTEs" onSuccess={invalidate} />
    </>
  );
}
