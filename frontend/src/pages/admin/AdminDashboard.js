import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { StatCard, PageHeader, Spinner } from '../../components/ui';
import { ClipboardList, Users, Building2, Clock, CheckCircle, FileEdit, UserCheck, UserCog } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="System-wide overview" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Assignments" value={stats?.totalAssignments} icon={ClipboardList} color="navy" />
        <StatCard label="Pending (MAS Review)" value={stats?.pending} icon={Clock} color="amber" />
        <StatCard label="Completed" value={stats?.completed} icon={CheckCircle} color="emerald" />
        <StatCard label="Draft" value={stats?.draft} icon={FileEdit} color="gray" />
        <StatCard label="Total Clients" value={stats?.totalClients} icon={Building2} color="blue" />
        <StatCard label="Staff Users" value={stats?.totalStaff} icon={Users} color="purple" />
        <StatCard label="MAS Officers" value={stats?.totalMas} icon={UserCog} color="navy" />
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-navy-100">
          <h2 className="font-semibold text-navy-800 text-sm">Recent System Activity</h2>
        </div>
        <div className="divide-y divide-navy-50">
          {!stats?.recentActivity?.length && (
            <div className="px-5 py-6 text-center text-sm text-gray-400">No activity yet.</div>
          )}
          {stats?.recentActivity?.map(log => (
            <div key={log.log_id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-0.5 rounded mr-2">{log.action_type}</span>
                <span className="text-sm text-gray-600">{log.full_name || 'System'}</span>
                {log.entity_id && <span className="text-xs text-gray-400 ml-2">#{log.entity_id}</span>}
              </div>
              <div className="text-xs text-gray-400">{new Date(log.created_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
