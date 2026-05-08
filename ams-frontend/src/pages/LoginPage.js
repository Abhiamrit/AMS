import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'STAFF') navigate('/staff');
      else navigate('/mas');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter username and password.'); return;
    }
    setLoading(true);
    try {
      const u = await login(form.username.trim(), form.password);
      toast.success(`Welcome, ${u.full_name}!`);
      if (u.role === 'ADMIN') navigate('/admin');
      else if (u.role === 'STAFF') navigate('/staff');
      else navigate('/mas');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-navy-700 flex items-center justify-center px-4">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }} />

      <div className="w-full max-w-sm relative">
        {/* Header */}
        <div className="bg-navy-800 rounded-t-xl px-8 py-7 text-center border-b-2 border-gold-500">
          {/* Real MECON logo */}
          <div className="flex justify-center mb-3">
            <img src="/mecon-logo.png" alt="MECON Logo"
              className="w-20 h-20 object-contain rounded-full bg-white p-1 shadow-lg" />
          </div>
          <div className="text-white font-bold text-xl tracking-wide">MECON LIMITED</div>
          <div className="text-navy-300 text-xs mt-1">A Government of India Enterprise | ISO 9001 Company</div>
          <div className="text-gold-400 text-sm font-medium mt-2">Assignment Management System</div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-b-xl px-8 py-7 shadow-2xl">
          <h2 className="text-navy-800 font-semibold text-base mb-5 text-center">Sign In to Continue</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input type="text" className="input" placeholder="Enter your username"
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                autoComplete="username" autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-10"
                  placeholder="Enter your password"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            For account issues, contact the System Administrator
          </div>

          <div className="mt-3 bg-navy-50 rounded p-3 text-xs text-navy-600">
            <div className="font-semibold mb-1">Demo Credentials:</div>
            <div>admin / Admin@1234 &nbsp;(Admin)</div>
            <div>staff1 / Staff@1234 &nbsp;(Staff)</div>
            <div>mas1 / Mas@1234 &nbsp;&nbsp;(MAS Officer)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
