import React, { useState, useEffect, useCallback } from 'react';
import { ListOrdered, Search, RefreshCw, Activity, ShieldCheck, ShieldAlert, KeyRound, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

interface EventLog {
  id: string;
  appId: string;
  event: string;
  description: string;
  ip?: string;
  timestamp: string;
}

export const EventLogs: React.FC = () => {
  const { currentApp } = useApp();
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!currentApp) return;
    setLoading(true);
    try {
      const res = await api.get<EventLog[]>(`/api/apps/${currentApp.id}/logs`);
      if (Array.isArray(res.data)) setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentApp]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(l =>
    l.event.toLowerCase().includes(search.toLowerCase()) ||
    l.description.toLowerCase().includes(search.toLowerCase()) ||
    (l.ip && l.ip.includes(search))
  );

  const getEventBadge = (event: string) => {
    if (event.includes('fail') || event.includes('ban') || event.includes('block')) {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    if (event.includes('success') || event.includes('reg') || event.includes('created')) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Event Logs" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Audit Event Logs
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time server log tracking authentication attempts, key redemption, bans, HWID resets, and security events.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-3 py-2 rounded-lg bg-[#18191e] border border-[#272935] hover:border-orange-500/50 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter event logs..."
          className="w-full bg-[#16171c] border border-[#22242b] rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      <div className="bg-[#16171c] border border-[#22242b] rounded-xl overflow-x-auto shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#121316] border-b border-[#22242b] text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            <tr>
              <th className="p-3">Event Type</th>
              <th className="p-3">Description</th>
              <th className="p-3">Client IP</th>
              <th className="p-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2029]">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-zinc-500">Loading audit logs...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-zinc-500">
                  No log entries recorded yet for this application.
                </td>
              </tr>
            ) : (
              filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-[#191a22] transition-colors">
                  <td className="p-3">
                    <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${getEventBadge(l.event)}`}>
                      {l.event}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-200 font-medium">
                    {l.description}
                  </td>
                  <td className="p-3 font-mono text-zinc-400 text-[11px]">
                    {l.ip || 'Internal'}
                  </td>
                  <td className="p-3 font-mono text-zinc-500 text-[11px] whitespace-nowrap">
                    {formatDate(l.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
