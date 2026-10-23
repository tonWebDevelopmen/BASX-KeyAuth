import React, { useState, useEffect, useCallback } from 'react';
import { ShieldBan, Plus, Trash2, Cpu, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

interface BlacklistEntry {
  id: string;
  type: 'hwid' | 'ip';
  value: string;
  reason?: string;
  createdAt: string;
}

export const Blacklist: React.FC = () => {
  const { currentApp } = useApp();
  const [list, setList] = useState<BlacklistEntry[]>([]);
  const [type, setType] = useState<'hwid' | 'ip'>('hwid');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    if (!currentApp) return;
    setLoading(true);
    try {
      const res = await api.get<BlacklistEntry[]>(`/api/apps/${currentApp.id}/blacklist`);
      if (Array.isArray(res.data)) setList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentApp]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp || !value.trim()) return;
    await api.post(`/api/apps/${currentApp.id}/blacklist`, {
      type,
      value: value.trim(),
      reason: reason.trim() || undefined,
    });
    setValue('');
    setReason('');
    await fetchList();
  };

  const handleDelete = async (id: string) => {
    if (!currentApp) return;
    await api.delete(`/api/apps/${currentApp.id}/blacklist/${id}`);
    await fetchList();
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Blacklist" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Blacklist Management
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Block specific Hardware IDs (HWID) or IP addresses from interacting with client endpoints. Blocked machines are immediately rejected.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-rose-400" />
            Add Blacklist Entry
          </h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Block Target Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="hwid">Hardware ID (HWID)</option>
                <option value="ip">IP Address</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">
                {type === 'hwid' ? 'Hardware ID Hash' : 'IP Address'}
              </label>
              <input
                type="text"
                required
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={type === 'hwid' ? 'e.g. 5E9B4A... or HWID string' : 'e.g. 192.168.1.100'}
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Reason (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Memory dumping or license sharing"
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all"
            >
              Add to Blacklist
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-500 text-xs py-8 text-center">Loading blacklist...</div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#22242b] rounded-xl text-zinc-400 text-xs">
              No blacklisted IPs or HWIDs. Your application is clean.
            </div>
          ) : (
            list.map(b => (
              <div
                key={b.id}
                className="bg-[#16171c] border border-[#22242b] rounded-xl p-4 flex items-center justify-between hover:border-[#2f313c] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    {b.type === 'hwid' ? <Cpu className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono text-white flex items-center gap-2">
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {b.type}
                      </span>
                      <span>{b.value}</span>
                    </div>
                    {b.reason && (
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Reason: {b.reason}
                      </div>
                    )}
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Blocked on: {formatDate(b.createdAt)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                  title="Remove from Blacklist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
