import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { PageHeader, Spinner } from '../../components/ui';
import AssignmentTableBuilder from '../../components/AssignmentTableBuilder';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const PREDEFINED_COLUMNS = [
  { column_id: 0, column_name: 'S.No.',       column_type: 'NUMBER', column_order: 0, is_predefined: 1 },
  { column_id: 1, column_name: 'Description', column_type: 'TEXT',   column_order: 1, is_predefined: 1 },
  { column_id: 2, column_name: 'Quantity',    column_type: 'NUMBER', column_order: 2, is_predefined: 1 },
  { column_id: 3, column_name: 'Unit',        column_type: 'TEXT',   column_order: 3, is_predefined: 1 },
  { column_id: 4, column_name: 'Remarks',     column_type: 'TEXT',   column_order: 4, is_predefined: 1 },
];

export default function CreateAssignment() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ assignment_name: '', client_id: '', section_id: '', scope: '' });
  const [tableData, setTableData] = useState({ columns: PREDEFINED_COLUMNS, rows: [] });

  useEffect(() => {
    Promise.all([api.get('/clients'), api.get('/sections')])
      .then(([c, s]) => { setClients(c.data.clients); setSections(s.data.sections); setLoading(false); });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assignment_name.trim() || !form.client_id || !form.section_id) {
      toast.error('Please fill in all required fields.'); return;
    }
    setSaving(true);
    try {
      // columns sent with order matching their index in array
      const columns = tableData.columns.map((col, i) => ({
        column_name: col.column_name,
        column_type: col.column_type,
        column_order: i,
        is_predefined: col.is_predefined || 0,
      }));
      // rows: cells keyed by column index (0,1,2...)
      const rows = tableData.rows.map((row, ri) => ({
        row_order: ri,
        cells: Object.fromEntries(
          tableData.columns.map((_, i) => [i, row.cells[i] ?? ''])
        ),
      }));
      const res = await api.post('/assignments', {
        ...form,
        client_id: parseInt(form.client_id),
        section_id: parseInt(form.section_id),
        columns,
        rows,
      });
      toast.success(`Assignment ${res.data.assignment_code} created!`);
      navigate('/staff/assignments');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create assignment.');
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Create New Assignment" subtitle="Fill in the details and build the data table"
        action={<button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/staff/assignments')}><ArrowLeft size={16} /> Back</button>} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-navy-800 border-b border-navy-100 pb-3">Assignment Details</h3>
          <div>
            <label className="label">Assignment Name *</label>
            <input className="input" required placeholder="e.g. Feasibility Study for Plant Expansion"
              value={form.assignment_name} onChange={e => setForm({ ...form, assignment_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Client *</label>
              <select className="input" required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">— Select Client —</option>
                {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name} ({c.client_type})</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Can't find client? <button type="button" onClick={() => navigate('/staff/clients')} className="text-navy-600 underline">Add a new client</button></p>
            </div>
            <div>
              <label className="label">Section *</label>
              <select className="input" required value={form.section_id} onChange={e => setForm({ ...form, section_id: e.target.value })}>
                <option value="">— Select Section —</option>
                {sections.map(s => <option key={s.section_id} value={s.section_id}>{s.section_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Scope of Work</label>
            <textarea className="input resize-none" rows={3} placeholder="Describe the scope, objectives, and deliverables…"
              value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} />
          </div>
        </div>
        <div className="card p-6">
          <AssignmentTableBuilder columns={tableData.columns} rows={tableData.rows}
            onChange={({ columns, rows }) => setTableData({ columns, rows })} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/staff/assignments')}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            <Save size={16} />{saving ? 'Saving…' : 'Save as Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
