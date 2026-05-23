import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { StatCard, PageHeader, Badge, Spinner, EmptyState } from '../../components/ui';
import { ClipboardList, Clock, CheckCircle, Eye } from 'lucide-react';

export default function MasDashboard() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  useEffect(() => {
    api.get('/assignments').then(r => { setAssignments(r.data.assignments); setLoading(false); });
  }, []);

  const pending   = assignments.filter(a => a.status === 'PENDING').length;
  const completed = assignments.filter(a => a.status === 'COMPLETED').length;
  const filtered  = statusFilter ? assignments.filter(a => a.status === statusFilter) : assignments;

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="MAS Officer Portal" subtitle="Review and complete forwarded assignments" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Received" value={assignments.length} icon={ClipboardList} color="navy" />
        <StatCard label="Pending Review" value={pending} icon={Clock} color="amber" />
        <StatCard label="Completed" value={completed} icon={CheckCircle} color="emerald" />
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-navy-100 flex items-center gap-3">
          {[
            { label: 'Pending', val: 'PENDING' },
            { label: 'Completed', val: 'COMPLETED' },
            { label: 'All', val: '' },
          ].map(({ label, val }) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${statusFilter === val ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-navy-700 border-navy-200 hover:bg-navy-50'}`}>
              {label} ({(val ? assignments.filter(a => a.status === val) : assignments).length})
            </button>
          ))}
        </div>

        <table className="w-full">
          <thead>
            <tr>{['Code', 'Assignment Name', 'Client', 'Section', 'Forwarded', 'Status', 'Action'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7}><EmptyState message="No assignments in this category." /></td></tr>}
            {filtered.map(a => (
              <tr key={a.assignment_id} className="hover:bg-navy-50">
                <td className="table-td font-mono text-xs text-navy-700 font-semibold">{a.assignment_code}</td>
                <td className="table-td font-medium text-navy-800 max-w-xs truncate">{a.assignment_name}</td>
                <td className="table-td text-gray-500 text-xs">{a.client_name}</td>
                <td className="table-td text-gray-500 text-xs">{a.section_name}</td>
                <td className="table-td text-xs text-gray-400">
                  {a.forwarded_at ? new Date(a.forwarded_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="table-td"><Badge status={a.status} /></td>
                <td className="table-td">
                  <button onClick={() => navigate(`/mas/assignments/${a.assignment_id}`)}
                    className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 font-medium">
                    <Eye size={13} /> Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
