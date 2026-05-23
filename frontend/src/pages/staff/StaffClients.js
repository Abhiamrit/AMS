import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { PageHeader, Modal, Badge, Spinner, EmptyState } from '../../components/ui';
import toast from 'react-hot-toast';
import { Plus, Pencil } from 'lucide-react';

const EMPTY = { client_name: '', client_type: 'GOVERNMENT', address: '', associated_project: '' };

// FIX: defined OUTSIDE parent — prevents input losing focus on every keystroke
function ClientForm({ form, setForm, onSubmit, onCancel, saving, btnLabel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Client Name *</label>
        <input className="input" required value={form.client_name}
          onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
      </div>
      <div>
        <label className="label">Client Type *</label>
        <select className="input" value={form.client_type}
          onChange={e => setForm(f => ({ ...f, client_type: e.target.value }))}>
          <option value="GOVERNMENT">Government</option>
          <option value="PRIVATE">Private</option>
        </select>
      </div>
      <div>
        <label className="label">Address</label>
        <textarea className="input resize-none" rows={2} value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
      </div>
      <div>
        <label className="label">Associated Project</label>
        <input className="input" value={form.associated_project}
          onChange={e => setForm(f => ({ ...f, associated_project: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : btnLabel}</button>
      </div>
    </form>
  );
}

export default function StaffClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchClients = () =>
    api.get(`/clients${search ? `?search=${search}` : ''}`).then(r => {
      setClients(r.data.clients); setLoading(false);
    });

  useEffect(() => { fetchClients(); }, []); // eslint-disable-line

  const handleSearch = (e) => { e.preventDefault(); fetchClients(); };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/clients', form);
      toast.success('Client created successfully.');
      setShowCreate(false); setForm(EMPTY); fetchClients();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create client.'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.patch(`/clients/${editClient.client_id}`, form);
      toast.success('Client updated.');
      setEditClient(null); fetchClients();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update client.'); }
    finally { setSaving(false); }
  };

  const openEdit = (c) => {
    setEditClient(c);
    setForm({ client_name: c.client_name, client_type: c.client_type, address: c.address || '', associated_project: c.associated_project || '' });
  };

  return (
    <div>
      <PageHeader title="My Clients" subtitle="Clients you have registered"
        action={<button className="btn-primary flex items-center gap-2" onClick={() => { setShowCreate(true); setForm(EMPTY); }}><Plus size={16} />Add Client</button>} />

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input className="input max-w-xs" placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
        <button type="submit" className="btn-secondary">Search</button>
        {search && <button type="button" className="btn-secondary" onClick={() => { setSearch(''); setTimeout(fetchClients, 0); }}>Clear</button>}
      </form>

      {loading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>{['Code', 'Client Name', 'Type', 'Project', 'Address', 'Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {clients.length === 0 && <tr><td colSpan={6}><EmptyState message="No clients found." /></td></tr>}
              {clients.map(c => (
                <tr key={c.client_id} className="hover:bg-navy-50">
                  <td className="table-td font-mono text-xs text-gray-500">{c.client_code}</td>
                  <td className="table-td font-medium text-navy-800">{c.client_name}</td>
                  <td className="table-td"><Badge status={c.client_type} /></td>
                  <td className="table-td text-gray-500 text-xs">{c.associated_project || '—'}</td>
                  <td className="table-td text-gray-500 text-xs max-w-xs truncate">{c.address || '—'}</td>
                  <td className="table-td">
                    <button onClick={() => openEdit(c)} className="text-navy-600 hover:text-navy-800 p-1"><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Client">
        <ClientForm form={form} setForm={setForm} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} btnLabel="Create Client" />
      </Modal>
      <Modal open={!!editClient} onClose={() => setEditClient(null)} title={`Edit Client — ${editClient?.client_code}`}>
        <ClientForm form={form} setForm={setForm} onSubmit={handleEdit} onCancel={() => setEditClient(null)} saving={saving} btnLabel="Save Changes" />
      </Modal>
    </div>
  );
}
