import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/tables/DataTable';
import { Modal, FormField, FormErrors, Btn } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast.jsx';
import { api } from '../lib/api';
import { keys } from '../lib/queryKeys';

export function ApplicationGroups() {
  const showToast = useToast();
  const qc        = useQueryClient();
  const [modal, setModal]       = useState(null);
  const [membersModal, setMembersModal] = useState(null); // { group }
  const [errors, setErrors]     = useState([]);
  const [name, setName]         = useState('');
  const [selected, setSelected] = useState(new Set()); // member app ids

  const { data: groups = [], isLoading } = useQuery({
    queryKey: keys.appGroups.list(),
    queryFn:  () => api.get('/application-groups'),
  });
  const { data: allApps = [] } = useQuery({
    queryKey: keys.applications.list(),
    queryFn:  () => api.get('/applications'),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.appGroups.list() });

  const saveMut = useMutation({
    mutationFn: (data) => modal?.mode === 'edit'
      ? api.put(`/application-groups/${modal.data.id}`, data)
      : api.post('/application-groups', data),
    onSuccess: () => { invalidate(); setModal(null); showToast(modal?.mode === 'edit' ? 'Group updated.' : 'Group created.'); },
    onError:   (e) => setErrors(e.errors ?? [e.message]),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/application-groups/${id}`),
    onSuccess: () => { invalidate(); showToast('Group deleted.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const membersMut = useMutation({
    mutationFn: ({ id, app_ids }) => api.put(`/application-groups/${id}/members`, { app_ids }),
    onSuccess: () => { invalidate(); setMembersModal(null); showToast('Members updated.'); },
    onError:   (e) => showToast(e.errors?.[0] ?? e.message, 'error'),
  });

  const openAdd  = () => { setName(''); setErrors([]); setModal({ mode: 'add' }); };
  const openEdit = (row) => { setName(row.name); setErrors([]); setModal({ mode: 'edit', data: row }); };

  const openMembers = async (group) => {
    const members = await api.get(`/application-groups/${group.id}/members`);
    setSelected(new Set(members.map(m => m.id)));
    setMembersModal({ group });
  };

  const submit = (e) => { e.preventDefault(); setErrors([]); saveMut.mutate({ name }); };

  const columns = [
    { key: 'name',         label: 'Name' },
    { key: 'member_count', label: 'Members', className: 'text-right w-24', render: r => r.member_count ?? 0 },
  ];

  return (
    <>
      <PageHeader title="Application Groups" description="Logical groupings of applications">
        <Btn onClick={openAdd}>+ Add Group</Btn>
      </PageHeader>

      <div className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <DataTable
            columns={columns}
            rows={groups}
            loading={isLoading}
            onEdit={openEdit}
            onDelete={(r) => deleteMut.mutate(r.id)}
            emptyMessage="No groups yet."
          />
        </div>
        {/* Members buttons overlaid via the row action — show as extra column */}
        {groups.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            Tip: click a group row's Edit button to rename, or use the Members button to assign applications.
          </p>
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Rename Group' : 'Add Group'}
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
          <FormField label="Group Name *">
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </FormField>
          {modal?.mode === 'edit' && (
            <Btn variant="secondary" type="button" onClick={() => { setModal(null); openMembers(modal.data); }}>
              Manage Members →
            </Btn>
          )}
        </form>
      </Modal>

      {/* Members modal */}
      <Modal
        open={!!membersModal}
        onClose={() => setMembersModal(null)}
        title={`Members — ${membersModal?.group?.name}`}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setMembersModal(null)}>Cancel</Btn>
            <Btn
              onClick={() => membersMut.mutate({ id: membersModal.group.id, app_ids: [...selected] })}
              disabled={membersMut.isPending}
            >
              {membersMut.isPending ? 'Saving…' : 'Save Members'}
            </Btn>
          </>
        }
      >
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {allApps.map(app => (
            <label key={app.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={selected.has(app.id)}
                onChange={e => {
                  const s = new Set(selected);
                  e.target.checked ? s.add(app.id) : s.delete(app.id);
                  setSelected(s);
                }}
              />
              <span className="text-sm text-slate-700">{app.name}</span>
              {app.group_id && app.group_id !== membersModal?.group?.id && (
                <span className="ml-auto text-xs text-slate-400">(in another group)</span>
              )}
            </label>
          ))}
          {allApps.length === 0 && <p className="px-3 py-4 text-sm text-slate-400">No applications exist yet.</p>}
        </div>
      </Modal>
    </>
  );
}
