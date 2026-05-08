import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Layers, Building2,
  ClipboardList, Bell, LogOut, Menu, X, ScrollText
} from 'lucide-react';

function NavItem({ to, icon: Icon, label, onClick }) {
  if (onClick) return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-navy-200 hover:bg-navy-600 hover:text-white w-full text-left text-sm transition-colors">
      <Icon size={16} /><span>{label}</span>
    </button>
  );
  return (
    <NavLink to={to} end={to === '/admin' || to === '/staff' || to === '/mas'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-navy-600 text-white font-medium' : 'text-navy-200 hover:bg-navy-600 hover:text-white'}`
      }>
      <Icon size={16} /><span>{label}</span>
    </NavLink>
  );
}

const NAV_LINKS = {
  ADMIN: [
    { to: '/admin',            icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users',      icon: Users,           label: 'User Management' },
    { to: '/admin/sections',   icon: Layers,          label: 'Sections' },
    { to: '/admin/assignments',icon: ClipboardList,   label: 'All Assignments' },
    { to: '/admin/clients',    icon: Building2,       label: 'All Clients' },
    { to: '/admin/audit',      icon: ScrollText,      label: 'Audit Log' },
  ],
  STAFF: [
    { to: '/staff',             icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/staff/clients',     icon: Building2,       label: 'My Clients' },
    { to: '/staff/assignments', icon: ClipboardList,   label: 'My Assignments' },
  ],
  MAS: [
    { to: '/mas', icon: LayoutDashboard, label: 'MAS Dashboard' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await api.patch(`/notifications/${notif.notification_id}/read`);
      fetchNotifications();
    }
    if (notif.related_assignment_id) {
      const role = user.role;
      if (role === 'MAS') navigate(`/mas/assignments/${notif.related_assignment_id}`);
      else if (role === 'STAFF') navigate('/staff/assignments');
      else navigate('/admin/assignments');
    }
    setNotifOpen(false);
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all/mark');
    fetchNotifications();
  };

  const links = NAV_LINKS[user?.role] || [];

  return (
    <div className="flex h-screen bg-navy-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} bg-navy-700 flex-shrink-0 flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-navy-600">
          <div className="flex items-center gap-3">
            <img src="/mecon-logo.png" alt="MECON Logo"
              className="w-11 h-11 rounded-full object-contain bg-white p-0.5 flex-shrink-0 shadow" />
            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-wide">MECON LIMITED</div>
              <div className="text-navy-300 text-xs">Assignment Management</div>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-navy-600">
          <div className="text-navy-300 text-xs mb-0.5">Logged in as</div>
          <div className="text-white text-sm font-medium truncate">{user?.full_name}</div>
          <span className={`badge-${user?.role?.toLowerCase()} mt-1`}>{user?.role}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {links.map(link => (
            <NavItem key={link.to} to={link.to} icon={link.icon} label={link.label} />
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-navy-600">
          <NavItem icon={LogOut} label="Logout" onClick={handleLogout} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-navy-100 h-14 flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-navy-600 hover:text-navy-800 p-1 rounded">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-navy-600 hover:text-navy-800 hover:bg-navy-50 rounded-full">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-10 w-80 bg-white border border-navy-100 rounded-lg shadow-lg z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-navy-100">
                    <span className="font-semibold text-navy-800 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-navy-500 hover:text-navy-700">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0
                      ? <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications</div>
                      : notifications.map(n => (
                        <div key={n.notification_id} onClick={() => handleNotifClick(n)}
                          className={`px-4 py-3 border-b border-navy-50 cursor-pointer hover:bg-navy-50 ${!n.is_read ? 'bg-blue-50' : ''}`}>
                          <div className="text-xs text-gray-700">{n.message}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(n.created_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* User */}
            <div className="flex items-center gap-2 text-sm text-navy-700">
              <div className="w-7 h-7 bg-navy-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user?.full_name?.[0] || 'U'}
              </div>
              <span className="font-medium hidden sm:block">{user?.full_name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
