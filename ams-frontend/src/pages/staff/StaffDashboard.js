import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { StatCard, PageHeader, Badge, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, Clock, CheckCircle, FileEdit, Plus } from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assignments').then(r => { setAssignments(r.data.assignments); setLoading(false); });
  }, []);

  const draft     = assignments.filter(a => a.status === 'DRAFT').length;
  const pending   = assignments.filter(a => a.status === 'PENDING').length;
  const completed = assignments.filter(a => a.status === 'COMPLETED').length;
  const recent    = assignments.slice(0, 5);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.full_name}`}
        subtitle="Your assignment summary"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/staff/assignments/new')}>
            <Plus size={16} /> New Assignment
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={assignments.length} icon={ClipboardList} color="navy" />
        <StatCard label="Draft" value={draft} icon={FileEdit} color="gray" />
        <StatCard label="Pending Review" value={pending} icon={Clock} color="amber" />
        <StatCard label="Completed" value={completed} icon={CheckCircle} color="emerald" />
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-navy-100 flex items-center justify-between">
          <h2 className="font-semibold text-navy-800 text-sm">Recent Assignments</h2>
          <button onClick={() => navigate('/staff/assignments')} className="text-xs text-navy-600 hover:underline">View all</button>
        </div>
        <table className="w-full">
          <thead>
            <tr>{['Code', 'Name', 'Client', 'Section', 'Status', 'Date'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No assignments yet. <button onClick={() => navigate('/staff/assignments/new')} className="text-navy-600 underline">Create one</button></td></tr>
            )}
            {recent.map(a => (
              <tr key={a.assignment_id} className="hover:bg-navy-50 cursor-pointer"
                onClick={() => a.status === 'DRAFT' ? navigate(`/staff/assignments/${a.assignment_id}/edit`) : null}>
                <td className="table-td font-mono text-xs text-navy-700">{a.assignment_code}</td>
                <td className="table-td text-navy-800 font-medium">{a.assignment_name}</td>
                <td className="table-td text-gray-500 text-xs">{a.client_name}</td>
                <td className="table-td text-gray-500 text-xs">{a.section_name}</td>
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
