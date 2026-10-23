import React, { useState } from 'react';
import { Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    if (trimmedUser.toUpperCase() !== 'BASX' || password !== 'Saree2508') {
      setError('Invalid username or password.');
      return;
    }

    setLoading(true);
    const res = await login('BASX', password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Access denied');
    } else {
      navigate('/app');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1013] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand lockup */}
      <div className="flex flex-col items-center gap-2 mb-8 z-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/25">
          <Lock className="w-6 h-6 text-white stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <h1 className="font-extrabold text-2xl tracking-tight text-white font-sans">
            Basx<span className="text-orange-500">Auth</span>
          </h1>
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
            Service PRO
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Enterprise License Key Authentication & Application Management
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#16171c] border border-[#22242b] rounded-2xl p-8 shadow-2xl z-10 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Sign In to Dashboard</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Restricted Access: Authorized credentials required.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">User</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="x"
                className="w-full bg-[#111216] border border-[#282a35] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 transition-colors font-mono font-normal"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="x"
                className="w-full bg-[#111216] border border-[#282a35] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
