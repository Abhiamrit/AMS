import React from 'react';

export function StatCard({ label, value, icon: Icon, color = 'navy' }) {
  const colors = {
    navy:    'bg-navy-700 text-white',
    amber:   'bg-amber-500 text-white',
    emerald: 'bg-emerald-600 text-white',
    blue:    'bg-blue-600 text-white',
    purple:  'bg-purple-600 text-white',
    gray:    'bg-gray-500 text-white',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-navy-800">{value ?? '—'}</div>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

export function Badge({ status }) {
  const map = {
    DRAFT: 'badge-draft',
    PENDING: 'badge-pending',
    COMPLETED: 'badge-completed',
    ADMIN: 'badge-admin',
    STAFF: 'badge-staff',
    MAS: 'badge-mas',
    GOVERNMENT: 'inline-block px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800',
    PRIVATE: 'inline-block px-2 py-0.5 rounded text-xs font-semibold bg-pink-100 text-pink-800',
  };
  return <span className={map[status] || 'badge-draft'}>{status}</span>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-navy-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
          <h3 className="font-semibold text-navy-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
    </div>
  );
}

export function EmptyState({ message = 'No records found.' }) {
  return (
    <div className="text-center py-12 text-gray-400 text-sm">{message}</div>
  );
}
