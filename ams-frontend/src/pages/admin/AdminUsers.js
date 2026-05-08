import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { PageHeader, Modal, Badge, Spinner, EmptyState } from '../../components/ui';
import toast from 'react-hot-toast';
import { UserPlus, KeyRound, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'STAFF' });
  const [newPass, setNewPass] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = () => api.get('/admin/users').then(r => { setUsers(r.data.users); setLoading(false); });
  useEffect(() => { fetchUsers(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/users', form);
      toast.success('User created successfully.');
      setShowCreate(false);
      setForm({ username: '', password: '', full_name: '', role: 'STAFF' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user.');
    } finally { setSaving(false); }
  };

  const toggleStatus = async (u) => {
    try {
      await api.patch(`/admin/users/${u.user_id}/status`, { is_active: !u.is_active });
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}.`);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/admin/users/${showReset.user_id}/reset-password`, { new_password: newPass });
      toast.success('Password reset successfully.');
      setShowReset(null);
      setNewPass('');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="User Management" subtitle="Create and manage system users"
        action={<button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}><UserPlus size={16} />Create User</button>} />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              {['Full Name', 'Username', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan={6}><EmptyState /></td></tr>}
            {users.map(u => (
              <tr key={u.user_id} className="hover:bg-navy-50">
                <td className="table-td font-medium text-navy-800">{u.full_name}</td>
                <td className="table-td text-gray-500">{u.username}</td>
                <td className="table-td"><Badge status={u.role} /></td>
                <td className="table-td">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="table-td text-xs text-gray-400">{u.last_login ? new Date(u.last_login + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}</td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setShowReset(u); setNewPass(''); }} className="text-navy-600 hover:text-navy-800 p-1" title="Reset Password"><KeyRound size={15} /></button>
                    {u.role !== 'ADMIN' && (
                      <button onClick={() => toggleStatus(u)} className={`p-1 ${u.is_active ? 'text-red-500 hover:text-red-700' : 'text-emerald-500 hover:text-emerald-700'}`} title={u.is_active ? 'Deactivate' : 'Activate'}>
                        {u.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User">
        <form onSubmit={createUser} className="space-y-4">
          <div><label className="label">Full Name</label><input className="input" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><label className="label">Username</label><input className="input" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
          <div><label className="label">Password</label><input className="input" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="STAFF">Staff User</option>
              <option value="MAS">MAS Officer</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!showReset} onClose={() => setShowReset(null)} title={`Reset Password — ${showReset?.full_name}`}>
        <form onSubmit={resetPassword} className="space-y-4">
          <div><label className="label">New Password</label><input className="input" type="password" required minLength={6} value={newPass} onChange={e => setNewPass(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowReset(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Resetting…' : 'Reset Password'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
