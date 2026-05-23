import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { PageHeader, Badge, Spinner, EmptyState } from '../../components/ui';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/clients').then(r => { setClients(r.data.clients); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="All Clients" subtitle="Client records across the system" />
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>{['Code', 'Client Name', 'Type', 'Project', 'Created By', 'Date'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {clients.length === 0 && <tr><td colSpan={6}><EmptyState /></td></tr>}
            {clients.map(c => (
              <tr key={c.client_id} className="hover:bg-navy-50">
                <td className="table-td font-mono text-xs text-gray-500">{c.client_code}</td>
                <td className="table-td font-medium text-navy-800">{c.client_name}</td>
                <td className="table-td"><Badge status={c.client_type} /></td>
                <td className="table-td text-gray-500 text-xs">{c.associated_project || '—'}</td>
                <td className="table-td text-gray-500 text-xs">{c.created_by_name}</td>
                <td className="table-td text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
