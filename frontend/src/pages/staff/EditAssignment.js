import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { PageHeader, Spinner } from '../../components/ui';
import AssignmentTableBuilder from '../../components/AssignmentTableBuilder';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Lock } from 'lucide-react';

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
        setAssignment(asgn);
        setForm({ assignment_name: asgn.assignment_name, client_id: String(asgn.client_id), section_id: String(asgn.section_id), scope: asgn.scope || '' });

        const columns = asgn.columns.map((col, i) => ({
          column_id: i,
          _real_id: col.column_id,
          column_name: col.column_name,
          column_type: col.column_type,
          column_order: i,
          is_predefined: col.is_predefined,
        }));

        const rows = asgn.rows.map(row => {
          const cells = {};
          columns.forEach((col, i) => { cells[i] = row.cells[col._real_id] ?? ''; });
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

  // Read-only view for non-DRAFT assignments
  if (assignment && assignment.status !== 'DRAFT') {
    return (
      <div>
        <PageHeader title="Assignment" subtitle={assignment.assignment_code}
          action={<button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/staff/assignments')}><ArrowLeft size={16} /> Back</button>} />
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <Lock size={18} className="flex-shrink-0" />
            <div>
              <strong>Read-only:</strong> This assignment is currently <span className="font-semibold">{assignment.status}</span> and cannot be edited.
              {assignment.status === 'IN ROUTING' && ' It is being reviewed by the assigned sections.'}
              {assignment.status === 'UNDER REVIEW' && ' All sections have reviewed it — you may forward it to MAS from the Assignments list.'}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {[
              ['Assignment Name', assignment.assignment_name],
              ['Client', assignment.client_name],
              ['Section', assignment.section_name],
              ['Status', assignment.status],
              ['Created', new Date(assignment.created_at).toLocaleDateString('en-IN')],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-0.5">{label}</div>
                <div className="text-gray-800">{val || '—'}</div>
              </div>
            ))}
          </div>
          {assignment.scope && (
            <div className="pt-2 border-t border-navy-100">
              <div className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-1">Scope of Work</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.scope}</div>
            </div>
          )}
          {assignment.columns?.length > 0 && (
            <div className="pt-4 border-t border-navy-100">
              <h4 className="font-semibold text-navy-800 mb-3">Assignment Data Table</h4>
              <div className="overflow-x-auto rounded-lg border border-navy-200">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-navy-700">
                      <th className="px-3 py-2 text-left text-white font-medium">#</th>
                      {assignment.columns.map(col => (
                        <th key={col.column_id} className="px-3 py-2 text-left text-white font-medium">{col.column_name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignment.rows.length === 0 && (
                      <tr><td colSpan={assignment.columns.length + 1} className="text-center py-6 text-gray-400">No data rows.</td></tr>
                    )}
                    {assignment.rows.map((row, ri) => (
                      <tr key={row.row_id} className={ri % 2 === 0 ? 'bg-white' : 'bg-navy-50'}>
                        <td className="px-3 py-2 text-gray-400">{ri + 1}</td>
                        {assignment.columns.map(col => (
                          <td key={col.column_id} className="px-3 py-2 text-gray-700 border-l border-navy-100">
                            {row.cells[col.column_id] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
