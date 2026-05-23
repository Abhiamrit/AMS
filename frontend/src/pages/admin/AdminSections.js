import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { PageHeader, Modal, Spinner, EmptyState } from '../../components/ui';
import toast from 'react-hot-toast';
import { Plus, Pencil } from 'lucide-react';

// FIX: defined OUTSIDE parent so React does not recreate it on every keystroke
function SectionForm({ form, setForm, onSubmit, onCancel, saving, btnLabel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Section Name</label>
        <input className="input" required value={form.section_name}
          onChange={e => setForm(f => ({ ...f, section_name: e.target.value }))} />
      </div>
      <div>
        <label className="label">Section Head (Officer Name)</label>
        <input className="input" required value={form.section_head}
          onChange={e => setForm(f => ({ ...f, section_head: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : btnLabel}</button>
      </div>
    </form>
  );
}

export default function AdminSections() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [form, setForm] = useState({ section_name: '', section_head: '' });
  const [saving, setSaving] = useState(false);

  const fetchSections = () => api.get('/sections/all').then(r => { setSections(r.data.sections); setLoading(false); });
  useEffect(() => { fetchSections(); }, []);

  const openEdit = (s) => { setEditSection(s); setForm({ section_name: s.section_name, section_head: s.section_head }); };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/sections', form);
      toast.success('Section created.');
      setShowCreate(false); setForm({ section_name: '', section_head: '' }); fetchSections();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.patch(`/sections/${editSection.section_id}`, form);
      toast.success('Section updated.'); setEditSection(null); fetchSections();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s) => {
    try {
      await api.patch(`/sections/${s.section_id}`, { is_active: !s.is_active });
      toast.success(`Section ${s.is_active ? 'deactivated' : 'activated'}.`); fetchSections();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Section Master" subtitle="Manage organizational sections"
        action={<button className="btn-primary flex items-center gap-2" onClick={() => { setShowCreate(true); setForm({ section_name: '', section_head: '' }); }}><Plus size={16} />Add Section</button>} />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>{['Code', 'Section Name', 'Section Head', 'Status', 'Created', 'Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {sections.length === 0 && <tr><td colSpan={6}><EmptyState /></td></tr>}
            {sections.map(s => (
              <tr key={s.section_id} className="hover:bg-navy-50">
                <td className="table-td font-mono text-xs text-gray-500">{s.section_code}</td>
                <td className="table-td font-medium text-navy-800">{s.section_name}</td>
                <td className="table-td text-gray-600">{s.section_head}</td>
                <td className="table-td">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="table-td text-xs text-gray-400">
                  {new Date(s.created_at + 'Z').toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="text-navy-600 hover:text-navy-800 p-1"><Pencil size={14} /></button>
                    <button onClick={() => toggleActive(s)} className={`text-xs px-2 py-0.5 rounded border ${s.is_active ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'}`}>
                      {s.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Section">
        <SectionForm form={form} setForm={setForm} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} btnLabel="Create Section" />
      </Modal>
      <Modal open={!!editSection} onClose={() => setEditSection(null)} title={`Edit Section — ${editSection?.section_code}`}>
        <SectionForm form={form} setForm={setForm} onSubmit={handleEdit} onCancel={() => setEditSection(null)} saving={saving} btnLabel="Save Changes" />
      </Modal>
    </div>
  );
}
