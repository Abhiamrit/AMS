import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { PageHeader, Spinner, EmptyState } from '../../components/ui';
import { Search } from 'lucide-react';

const ACTION_TYPES = ['LOGIN','LOGOUT','ACCOUNT_LOCKED','USER_CREATED','USER_ACTIVATED','USER_DEACTIVATED',
  'PASSWORD_RESET','SECTION_CREATED','SECTION_UPDATED','CREATE_CLIENT','CREATE_ASSIGNMENT',
  'FORWARD_ASSIGNMENT','ASSIGNMENT_COMPLETED','ASSIGNMENT_EXPORTED_PDF','ASSIGNMENT_EXPORTED_EXCEL'];

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action_type: '', from_date: '', to_date: '', entity_id: '' });

  const fetchLogs = (f = filters) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.action_type) params.set('action_type', f.action_type);
    if (f.from_date) params.set('from_date', f.from_date);
    if (f.to_date) params.set('to_date', f.to_date);
    if (f.entity_id) params.set('entity_id', f.entity_id);
    api.get(`/admin/audit-logs?${params}`).then(r => { setLogs(r.data.logs); setLoading(false); });
  };

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Full system activity trail" />

      {/* Filters */}
      <div className="card p-4 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="label">Action Type</label>
          <select className="input" value={filters.action_type} onChange={e => setFilters({ ...filters, action_type: e.target.value })}>
            <option value="">All Actions</option>
            {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">From Date</label>
          <input type="date" className="input" value={filters.from_date} onChange={e => setFilters({ ...filters, from_date: e.target.value })} />
        </div>
        <div>
          <label className="label">To Date</label>
          <input type="date" className="input" value={filters.to_date} onChange={e => setFilters({ ...filters, to_date: e.target.value })} />
        </div>
        <div>
          <label className="label">Entity ID</label>
          <input className="input" placeholder="e.g. 5" value={filters.entity_id} onChange={e => setFilters({ ...filters, entity_id: e.target.value })} />
        </div>
        <div className="col-span-2 lg:col-span-4 flex gap-2">
          <button className="btn-primary flex items-center gap-2" onClick={() => fetchLogs()}>
            <Search size={14} /> Search
          </button>
          <button className="btn-secondary" onClick={() => { setFilters({ action_type: '', from_date: '', to_date: '', entity_id: '' }); fetchLogs({ action_type: '', from_date: '', to_date: '', entity_id: '' }); }}>
            Clear
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>{['Timestamp', 'User', 'Role', 'Action', 'Entity', 'ID', 'IP'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7}><Spinner /></td></tr>}
            {!loading && logs.length === 0 && <tr><td colSpan={7}><EmptyState /></td></tr>}
            {!loading && logs.map(log => (
              <tr key={log.log_id} className="hover:bg-navy-50">
                <td className="table-td text-xs text-gray-400 whitespace-nowrap">{new Date(log.created_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td className="table-td text-sm text-navy-800">{log.full_name || '—'}</td>
                <td className="table-td">
                  {log.user_role && <span className={`badge-${log.user_role?.toLowerCase()}`}>{log.user_role}</span>}
                </td>
                <td className="table-td">
                  <span className="inline-block text-xs font-mono bg-navy-50 text-navy-700 px-2 py-0.5 rounded">{log.action_type}</span>
                </td>
                <td className="table-td text-xs text-gray-500">{log.affected_entity || '—'}</td>
                <td className="table-td text-xs text-gray-400">{log.entity_id || '—'}</td>
                <td className="table-td text-xs text-gray-400">{log.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
