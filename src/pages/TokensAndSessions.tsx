import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Trash2, Shield, Activity, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

interface Session {
  id: string;
  appId: string;
  userId?: string | null;
  username?: string;
  hwid?: string | null;
  ip?: string;
  expiresAt: string;
  createdAt: string;
}

export const TokensAndSessions: React.FC = () => {
  const { currentApp } = useApp();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!currentApp) return;
    setLoading(true);
    try {
      const res = await api.get<Session[]>(`/api/apps/${currentApp.id}/sessions`);
      if (Array.isArray(res.data)) setSessions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentApp]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleKillSession = async (id: string) => {
    if (!currentApp) return;
    await api.delete(`/api/apps/${currentApp.id}/sessions/${id}`);
    await fetchSessions();
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Tokens & Active Sessions" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Active Client Sessions
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time authenticated desktop sessions. Client handshake tokens expire in 5 minutes unless refreshed by subsequent API calls.
          </p>
        </div>
        <button
          onClick={fetchSessions}
          className="px-3 py-2 rounded-lg bg-[#18191e] border border-[#272935] hover:border-orange-500/50 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-[#16171c] border border-[#22242b] rounded-xl overflow-x-auto shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#121316] border-b border-[#22242b] text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            <tr>
              <th className="p-3">Session Token</th>
              <th className="p-3">User</th>
              <th className="p-3">IP Address</th>
              <th className="p-3">Hardware ID (HWID)</th>
              <th className="p-3">Expires At</th>
              <th className="p-3">Created</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2029]">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">Loading active sessions...</td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  No active client sessions right now. Sessions appear when desktop clients initiate a handshake.
                </td>
              </tr>
            ) : (
              sessions.map(s => {
                const isExpired = new Date(s.expiresAt) <= new Date();
                return (
                  <tr key={s.id} className="hover:bg-[#191a22] transition-colors">
                    <td className="p-3 font-mono font-bold text-white truncate max-w-xs">
                      {s.id}
                    </td>
                    <td className="p-3 font-medium text-zinc-300">
                      {s.username || 'Anonymous Handshake'}
                    </td>
                    <td className="p-3 font-mono text-zinc-400 text-[11px]">
                      {s.ip || '127.0.0.1'}
                    </td>
                    <td className="p-3 font-mono text-zinc-400 text-[11px] truncate max-w-[140px]">
                      {s.hwid || 'N/A'}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      <span className={isExpired ? 'text-rose-400' : 'text-emerald-400 font-semibold'}>
                        {formatDate(s.expiresAt)}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-500 font-mono text-[11px]">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleKillSession(s.id)}
                        className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Kill</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
