import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { PageHeader, Spinner } from '../../components/ui';
import AssignmentTableBuilder from '../../components/AssignmentTableBuilder';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

export default function EditAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [form, setForm] = useState({ assignment_name: '', client_id: '', section_id: '', scope: '' });
  const [tableData, setTableData] = useState({ columns: [], rows: [] });

  useEffect(() => {
    Promise.all([api.get(`/assignments/${id}`), api.get('/clients'), api.get('/sections')])
      .then(([a, c, s]) => {
        const asgn = a.data.assignment;
        if (asgn.status !== 'DRAFT') { toast.error('This assignment cannot be edited.'); navigate('/staff/assignments'); return; }
        setAssignment(asgn);
        setForm({ assignment_name: asgn.assignment_name, client_id: String(asgn.client_id), section_id: String(asgn.section_id), scope: asgn.scope || '' });

        // Map columns: use array index as column_id for the builder
        const columns = asgn.columns.map((col, i) => ({
          column_id: i,            // integer index for cell lookup
          _real_id: col.column_id, // keep real id for cell data lookup
          column_name: col.column_name,
          column_type: col.column_type,
          column_order: i,
          is_predefined: col.is_predefined,
        }));

        // Map rows: re-key cells by column order index
        const rows = asgn.rows.map(row => {
          const cells = {};
          columns.forEach((col, i) => {
            cells[i] = row.cells[col._real_id] ?? '';
          });
          return { row_id: row.row_id, row_order: row.row_order, cells };
        });

        setTableData({ columns, rows });
        setClients(c.data.clients);
        setSections(s.data.sections);
        setLoading(false);
      }).catch(() => { toast.error('Failed to load assignment.'); navigate('/staff/assignments'); });
  }, [id]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const columns = tableData.columns.map((col, i) => ({
        column_name: col.column_name,
        column_type: col.column_type,
        column_order: i,
        is_predefined: col.is_predefined || 0,
      }));
      const rows = tableData.rows.map((row, ri) => ({
        row_order: ri,
        cells: Object.fromEntries(
          tableData.columns.map((_, i) => [i, row.cells[i] ?? ''])
        ),
      }));
      await api.put(`/assignments/${id}`, {
        ...form,
        client_id: parseInt(form.client_id),
        section_id: parseInt(form.section_id),
        columns, rows,
      });
      toast.success('Assignment saved.');
      navigate('/staff/assignments');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save.');
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Edit Assignment" subtitle={assignment?.assignment_code}
        action={<button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/staff/assignments')}><ArrowLeft size={16} /> Back</button>} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-navy-800 border-b border-navy-100 pb-3">Assignment Details</h3>
          <div>
            <label className="label">Assignment Name *</label>
            <input className="input" required value={form.assignment_name} onChange={e => setForm({ ...form, assignment_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Client *</label>
              <select className="input" required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">— Select Client —</option>
                {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name} ({c.client_type})</option>)}
              </select>
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
            <textarea className="input resize-none" rows={3} value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} />
          </div>
        </div>
        <div className="card p-6">
          <AssignmentTableBuilder columns={tableData.columns} rows={tableData.rows}
            onChange={({ columns, rows }) => setTableData({ columns, rows })} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/staff/assignments')}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            <Save size={16} />{saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
