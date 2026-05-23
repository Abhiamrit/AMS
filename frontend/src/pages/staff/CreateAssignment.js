import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { PageHeader, Spinner } from '../../components/ui';
import AssignmentTableBuilder from '../../components/AssignmentTableBuilder';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, ArrowRight, GitBranch, Plus, Trash2, GripVertical } from 'lucide-react';

const PREDEFINED_COLUMNS = [
  { column_id: 0, column_name: 'S.No.',       column_type: 'NUMBER', column_order: 0, is_predefined: 1 },
  { column_id: 1, column_name: 'Description', column_type: 'TEXT',   column_order: 1, is_predefined: 1 },
  { column_id: 2, column_name: 'Quantity',    column_type: 'NUMBER', column_order: 2, is_predefined: 1 },
  { column_id: 3, column_name: 'Unit',        column_type: 'TEXT',   column_order: 3, is_predefined: 1 },
  { column_id: 4, column_name: 'Remarks',     column_type: 'TEXT',   column_order: 4, is_predefined: 1 },
];

export default function CreateAssignment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1 = details, 2 = routing
  const [createdAssignment, setCreatedAssignment] = useState(null); // { assignment_id, assignment_code }
  const [form, setForm] = useState({ assignment_name: '', client_id: '', section_id: user?.section_id || '', scope: '' });
  const [tableData, setTableData] = useState({ columns: PREDEFINED_COLUMNS, rows: [] });

  // Routing step 2
  const [routingSections, setRoutingSections] = useState([]); // ordered list of section_ids
  const [startingRouting, setStartingRouting] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/clients'), api.get('/sections')])
      .then(([c, s]) => { setClients(c.data.clients); setSections(s.data.sections); setLoading(false); });
  }, []);

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    if (!form.assignment_name.trim() || !form.client_id || !form.section_id) {
      toast.error('Please fill in all required fields.'); return;
    }
    setSaving(true);
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
      const res = await api.post('/assignments', {
        ...form,
        client_id: parseInt(form.client_id),
        section_id: parseInt(form.section_id),
        columns,
        rows,
      });
      setCreatedAssignment({ assignment_id: res.data.assignment_id, assignment_code: res.data.assignment_code });
      toast.success(`Assignment ${res.data.assignment_code} saved as Draft!`);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create assignment.');
    } finally { setSaving(false); }
  };

  const addRoutingSection = (sectionId) => {
    const id = parseInt(sectionId);
    if (!id) return;
    if (routingSections.includes(id)) { toast.error('Section already added.'); return; }
    // Skip creator's own section only if they are the section head
    if (user?.is_section_head && user?.section_id && id === user.section_id) { toast.error("You cannot route to your own section."); return; }
    setRoutingSections([...routingSections, id]);
  };

  const removeRoutingSection = (idx) => {
    setRoutingSections(routingSections.filter((_, i) => i !== idx));
  };

  const moveSection = (idx, dir) => {
    const arr = [...routingSections];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setRoutingSections(arr);
  };

  const handleStartRouting = async () => {
    if (routingSections.length === 0) { toast.error('Add at least one section to route to.'); return; }
    setStartingRouting(true);
    try {
      await api.post(`/assignments/${createdAssignment.assignment_id}/route`, { section_ids: routingSections });
      toast.success(`Assignment ${createdAssignment.assignment_code} is now IN ROUTING!`);
      navigate('/staff/assignments');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start routing.');
    } finally { setStartingRouting(false); }
  };

  const getSectionName = (id) => sections.find(s => s.section_id === id)?.section_name || `Section #${id}`;

  // Sections available for routing (exclude creator's own section)
  const availableSections = sections.filter(s => !(user?.is_section_head && s.section_id === user?.section_id));

  if (loading) return <Spinner />;

  // ── STEP 2: Routing Setup ────────────────────────────────
  if (step === 2) {
    return (
      <div>
        <PageHeader
          title="Set Routing Order"
          subtitle={`Assignment ${createdAssignment?.assignment_code} saved — now define which sections review it and in what order`}
          action={<button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/staff/assignments')}><ArrowLeft size={16} /> Skip (route later)</button>}
        />

        <div className="card p-6 space-y-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800">
            <strong>How routing works:</strong> Your assignment will pass through each section in the order you set below.
            Each section head assigns it to a member, who reviews it and fills in their data table.
            Once all sections are done, it returns to you as <span className="font-semibold">UNDER REVIEW</span>.
          </div>

          {/* Section picker */}
          <div>
            <label className="label mb-2">Add Sections to Route</label>
            <div className="flex gap-2">
              <select className="input" defaultValue="" onChange={e => { addRoutingSection(e.target.value); e.target.value = ''; }}>
                <option value="">— Pick a section to add —</option>
                {availableSections
                  .filter(s => !routingSections.includes(s.section_id))
                  .map(s => <option key={s.section_id} value={s.section_id}>{s.section_name}</option>)}
              </select>
            </div>
          </div>

          {/* Ordered list */}
          <div>
            <label className="label mb-2">Routing Order</label>
            {routingSections.length === 0 ? (
              <div className="text-sm text-gray-400 italic py-4 text-center border border-dashed border-gray-300 rounded-lg">
                No sections added yet. Pick sections above to build the routing chain.
              </div>
            ) : (
              <div className="space-y-2">
                {routingSections.map((sectionId, idx) => (
                  <div key={sectionId} className="flex items-center gap-3 bg-white border border-navy-200 rounded-lg px-4 py-3 shadow-sm">
                    <span className="text-xs font-bold text-navy-400 w-5 text-center">{idx + 1}</span>
                    <GripVertical size={14} className="text-gray-300" />
                    <span className="flex-1 text-sm font-medium text-navy-800">{getSectionName(sectionId)}</span>
                    <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-navy-600 disabled:opacity-20 p-1 text-xs">▲</button>
                    <button onClick={() => moveSection(idx, 1)} disabled={idx === routingSections.length - 1} className="text-gray-400 hover:text-navy-600 disabled:opacity-20 p-1 text-xs">▼</button>
                    <button onClick={() => removeRoutingSection(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/staff/assignments')}>
              <ArrowLeft size={16} /> Save as Draft Only
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={handleStartRouting} disabled={startingRouting || routingSections.length === 0}>
              <GitBranch size={16} />{startingRouting ? 'Starting…' : 'Start Routing'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 1: Assignment Details ────────────────────────────
  return (
    <div>
      <PageHeader title="Create New Assignment" subtitle="Fill in the details and build the data table"
        action={<button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/staff/assignments')}><ArrowLeft size={16} /> Back</button>} />
      <form onSubmit={handleSaveDraft} className="space-y-6">
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
              <label className="label">Creator's Section</label>
              <div className="input bg-gray-50 text-gray-700 cursor-not-allowed">
                {sections.find(s => s.section_id === (user?.section_id))?.section_name || '—'}
              </div>
              <p className="text-xs text-gray-400 mt-1">Automatically set to your section.</p>
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
