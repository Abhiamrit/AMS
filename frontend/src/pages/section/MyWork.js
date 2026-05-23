import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { PageHeader, Spinner, EmptyState } from '../../components/ui';
import { ArrowRight } from 'lucide-react';

export default function MyWork() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assignments/inbox').then(r => { setItems(r.data.items); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Work" subtitle="Assignments currently assigned to you" />
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>{['Code', 'Assignment', 'Client', 'Section', 'Assigned By', 'Assigned On', 'Action'].map(h => (
              <th key={h} className="table-th">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={7}><EmptyState message="No work assigned to you right now." /></td></tr>}
            {items.map(item => (
              <tr key={item.routing_id} className="hover:bg-navy-50">
                <td className="table-td font-mono text-xs text-navy-700 font-semibold">{item.assignment_code}</td>
                <td className="table-td text-navy-800 font-medium max-w-xs truncate">{item.assignment_name}</td>
                <td className="table-td text-xs text-gray-500">{item.client_name}</td>
                <td className="table-td text-xs text-gray-500">{item.section_name}</td>
                <td className="table-td text-xs text-gray-500">{item.assigned_by_name}</td>
                <td className="table-td text-xs text-gray-400">
                  {item.assigned_at ? new Date(item.assigned_at + 'Z').toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="table-td">
                  <button
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                    onClick={() => navigate(`/section/work/${item.routing_id}`)}
                  >
                    Open Work <ArrowRight size={12} />
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
