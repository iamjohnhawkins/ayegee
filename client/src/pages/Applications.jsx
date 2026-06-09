import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/tables/DataTable';
import { Modal, FormField, FormErrors, Btn } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { BulkUploadModal } from '../components/ui/BulkUploadModal';
import { useToast } from '../hooks/useToast.jsx';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';

const EMPTY = { name: '', nar_id: '', status: 'INVEST', group_id: '' };

export function Applications() {
  const showToast  = useToast();
  const qc         = useQueryClient();
  const [modal, setModal]     = useState(null); // null | { mode:'add'|'edit', data }
  const [bulkOpen, setBulkOpen] = useState(false);
  const [errors, setErrors]   = useState([]);
  const [form, setForm]       = useState(EMPTY);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: keys.applications.list(),
    queryFn:  () => api.get('/applications'),
  });
  const { data: groups = [] } = useQuery({
    queryKey: keys.appGroups.list(),
    queryFn:  () => api.get('/application-groups'),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.applications.list() });

  const saveMut = useMutation({
    mutationFn: (data) => modal?.mode === 'edit'
      ? api.put(`/applications/${modal.data.id}`, data)
      : api.post('/applications', data),
    onSuccess: () => { invalidate(); setModal(null); showToast(modal?.mode === 'edit' ? 'Application updated.' : 'Application created.'); },
    onError:   (e) => setErrors(e.errors ?? [e.message]),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/applications/${id}`),
    onSuccess: () => { invalidate(); showToast('Application deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const openAdd  = () => { setForm(EMPTY); setErrors([]); setModal({ mode: 'add' }); };
  const openEdit = (row) => { setForm({ name: row.name, nar_id: row.nar_id ?? '', status: row.status, group_id: row.group_id ?? '' }); setErrors([]); setModal({ mode: 'edit', data: row }); };

  const submit = (e) => { e.preventDefault(); setErrors([]); saveMut.mutate({ ...form, group_id: form.group_id || null }); };

  const columns = [
    { key: 'name',       label: 'Name' },
    { key: 'nar_id',     label: 'NAR ID', className: 'font-mono text-xs text-slate-500' },
    { key: 'group_name', label: 'Group',  render: r => r.group_name ?? <span className="text-slate-300">—</span> },
    { key: 'status',     label: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader title="Applications" description="Manage application portfolio">
        <Btn variant="secondary" onClick={() => setBulkOpen(true)}>Bulk Upload</Btn>
        <Btn onClick={openAdd}>+ Add Application</Btn>
      </PageHeader>

      <div className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <DataTable
            columns={columns}
            rows={apps}
            loading={isLoading}
            onEdit={openEdit}
            onDelete={(r) => deleteMut.mutate(r.id)}
            emptyMessage="No applications yet."
          />
        </div>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit Application' : 'Add Application'}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={submit} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : 'Save'}
            </Btn>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <FormErrors errors={errors} />
          <FormField label="Name *">
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
          </FormField>
          <FormField label="NAR ID">
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              value={form.nar_id} onChange={e => setForm(f => ({...f, nar_id: e.target.value}))} placeholder="123456-1" />
          </FormField>
          <FormField label="Group">
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              value={form.group_id} onChange={e => setForm(f => ({...f, group_id: e.target.value}))}>
              <option value="">— None —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
              <option>INVEST</option>
              <option>MAINTAIN</option>
              <option>DISINVEST</option>
            </select>
          </FormField>
        </form>
      </Modal>

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        uploadPath="/applications/bulk-upload"
        samplePath="/applications/sample"
        entityLabel="Applications"
        onSuccess={invalidate}
      />
    </>
  );
}
