import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { PageHeader, Badge, Spinner, EmptyState } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/assignments').then(r => { setAssignments(r.data.assignments); setLoading(false); });
  }, []);

  const filtered = statusFilter ? assignments.filter(a => a.status === statusFilter) : assignments;

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="All Assignments" subtitle="System-wide assignment records" />

      <div className="flex gap-2 mb-4">
        {['', 'DRAFT', 'PENDING', 'COMPLETED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${statusFilter === s ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-navy-700 border-navy-200 hover:bg-navy-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>{['Assignment Code', 'Name', 'Client', 'Section', 'Created By', 'Status', 'Date'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7}><EmptyState /></td></tr>}
            {filtered.map(a => (
              <tr key={a.assignment_id} className="hover:bg-navy-50 cursor-pointer" onClick={() => navigate(`/mas/assignments/${a.assignment_id}`)}>
                <td className="table-td font-mono text-xs text-navy-700 font-semibold">{a.assignment_code}</td>
                <td className="table-td text-navy-800">{a.assignment_name}</td>
                <td className="table-td text-gray-600 text-xs">{a.client_name}</td>
                <td className="table-td text-gray-600 text-xs">{a.section_name}</td>
                <td className="table-td text-gray-500 text-xs">{a.created_by_name}</td>
                <td className="table-td"><Badge status={a.status} /></td>
                <td className="table-td text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
