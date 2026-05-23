import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { PageHeader, Spinner, EmptyState } from '../../components/ui';
import toast from 'react-hot-toast';
import { UserCheck, Clock, CheckCircle, AlertCircle, PenLine, Eye } from 'lucide-react';

export default function SectionInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [selectedMember, setSelectedMember] = useState('');
  const [busyId, setBusyId] = useState(null);

  const fetchData = async () => {
    if (!user?.section_id) return;
    const [iRes] = await Promise.all([
      api.get(`/routing/section/${user.section_id}`),
    ]);
    setItems(iRes.data.items);

    // Fetch section members for the assign modal
    try {
      const mRes = await api.get(`/sections/${user.section_id}/members`);
      setMembers(mRes.data.members || []);
    } catch {
      try {
        const uRes = await api.get('/admin/users');
        setMembers((uRes.data.users || []).filter(u =>
          u.section_id === user.section_id && u.role === 'STAFF' && u.is_active
        ));
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line

  // Section head fills the work themselves
  const handleFillMyself = async (item) => {
    setBusyId(item.routing_id);
    try {
      // If already assigned to me, go straight to work page
      if (item.assigned_to !== user.user_id) {
        await api.post(`/routing/${item.routing_id}/fill-myself`);
      }
      navigate(`/section/work/${item.routing_id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed.');
      setBusyId(null);
    }
  };

  // Open assign-to-member modal
  const openAssign = (item) => { setAssigning(item); setSelectedMember(''); };

  const handleAssign = async () => {
    if (!selectedMember) { toast.error('Select a member.'); return; }
    try {
      await api.post(`/routing/${assigning.routing_id}/assign`, { assigned_to: parseInt(selectedMember) });
      toast.success('Assigned successfully.');
      setAssigning(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign.');
    }
  };

  const statusBadge = (status) => {
    const map = {
      'WAITING':     'bg-gray-100 text-gray-500',
      'IN PROGRESS': 'bg-indigo-100 text-indigo-700',
      'DONE':        'bg-emerald-100 text-emerald-700',
      'SENT BACK':   'bg-red-100 text-red-700',
    };
    const iconMap = {
      'WAITING':     <Clock size={12} />,
      'IN PROGRESS': <Clock size={12} />,
      'DONE':        <CheckCircle size={12} />,
      'SENT BACK':   <AlertCircle size={12} />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || ''}`}>
        {iconMap[status]} {status}
      </span>
    );
  };

  if (loading) return <Spinner />;

  const pending    = items.filter(i => i.status === 'WAITING' || (i.status === 'IN PROGRESS' && !i.assigned_to));
  const inProgress = items.filter(i => i.status === 'IN PROGRESS' && i.assigned_to);
  const done       = items.filter(i => i.status === 'DONE' || i.status === 'SENT BACK');

  return (
    <div className="space-y-6">
      <PageHeader title="Section Inbox" subtitle="Assignments routed to your section" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending',     count: pending.length,    color: 'bg-amber-50 border-amber-200 text-amber-800' },
          { label: 'In Progress', count: inProgress.length, color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
          { label: 'Completed',   count: done.length,       color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`card p-4 border ${color} text-center`}>
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-xs font-medium mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              {['Code', 'Assignment', 'Client', 'Creator', 'Status', 'Assigned To', 'Actions'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={7}><EmptyState message="No assignments in your section's queue." /></td></tr>
            )}
            {items.map(item => {
              const isActive = ['WAITING', 'IN PROGRESS', 'SENT BACK'].includes(item.status);
              const isDone   = item.status === 'DONE';
              const isMine   = item.assigned_to === user.user_id;
              const busy     = busyId === item.routing_id;

              return (
                <tr key={item.routing_id} className="hover:bg-navy-50">
                  <td className="table-td font-mono text-xs text-navy-700 font-semibold">{item.assignment_code}</td>
                  <td className="table-td text-navy-800 font-medium max-w-xs truncate">{item.assignment_name}</td>
                  <td className="table-td text-xs text-gray-500">{item.client_name}</td>
                  <td className="table-td text-xs text-gray-500">{item.creator_name}</td>
                  <td className="table-td">{statusBadge(item.status)}</td>
                  <td className="table-td text-xs text-gray-600">
                    {item.assigned_to_name || <span className="text-gray-300 italic">Unassigned</span>}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5 flex-wrap">

                      {/* Section head: Fill Myself / Open Work */}
                      {user?.is_section_head && isActive && (
                        <button
                          className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
                          onClick={() => handleFillMyself(item)}
                          disabled={busy}
                        >
                          <PenLine size={12} />
                          {busy ? '…' : isMine ? 'Open Work' : 'Fill Myself'}
                        </button>
                      )}

                      {/* Section head: Assign to Member (only if not already done) */}
                      {user?.is_section_head && isActive && (
                        <button
                          className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                          onClick={() => openAssign(item)}
                        >
                          <UserCheck size={12} /> Assign
                        </button>
                      )}

                      {/* Non-head member: open their own assigned work */}
                      {!user?.is_section_head && isMine && isActive && (
                        <button
                          className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
                          onClick={() => navigate(`/section/work/${item.routing_id}`)}
                        >
                          Open Work
                        </button>
                      )}

                      {/* View completed (read-only) */}
                      {isDone && (
                        <button
                          className="btn-secondary text-xs py-1 px-2 flex items-center gap-1 opacity-60"
                          onClick={() => navigate(`/section/work/${item.routing_id}`)}
                        >
                          <Eye size={12} /> View
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssigning(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-navy-100">
              <h3 className="font-semibold text-navy-800">Assign to Member</h3>
              <div className="text-sm text-gray-500 mt-0.5">
                {assigning.assignment_code} — {assigning.assignment_name}
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Select Member</label>
                <select
                  className="input"
                  value={selectedMember}
                  onChange={e => setSelectedMember(e.target.value)}
                >
                  <option value="">— Pick a member —</option>
                  {members.filter(m => !m.is_section_head).map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setAssigning(null)}>Cancel</button>
                <button className="btn-primary flex items-center gap-2" onClick={handleAssign}>
                  <UserCheck size={14} /> Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
