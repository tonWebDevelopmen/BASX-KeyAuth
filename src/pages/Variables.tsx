import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Trash2, Key, Globe, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import api from '../lib/api';

interface Variable {
  id: string;
  key: string;
  value: string;
}

export const Variables: React.FC = () => {
  const { currentApp } = useApp();
  const [vars, setVars] = useState<Variable[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchVars = useCallback(async () => {
    if (!currentApp) return;
    setLoading(true);
    try {
      const res = await api.get<Variable[]>(`/api/apps/${currentApp.id}/variables`);
      if (Array.isArray(res.data)) setVars(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentApp]);

  useEffect(() => {
    fetchVars();
  }, [fetchVars]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp || !newKey.trim()) return;
    await api.post(`/api/apps/${currentApp.id}/variables`, {
      key: newKey.trim(),
      value: newValue.trim(),
    });
    setNewKey('');
    setNewValue('');
    await fetchVars();
  };

  const handleDelete = async (id: string) => {
    if (!currentApp) return;
    await api.delete(`/api/apps/${currentApp.id}/variables/${id}`);
    await fetchVars();
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Variables" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Application Variables
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Store server-side strings, URLs, secret keys, or configurations returned securely to client binaries during login or retrieved via type=getvar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create form */}
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-400" />
            Add Global Variable
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Variable Key (Name)</label>
              <input
                type="text"
                required
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="e.g. CHEAT_HASH, API_ENDPOINT, MOTD"
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Variable Value</label>
              <textarea
                rows={3}
                required
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="Value returned to authorized clients..."
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all"
            >
              Save Variable
            </button>
          </form>
        </div>

        {/* List of variables */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-500 text-xs py-8 text-center">Loading variables...</div>
          ) : vars.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#22242b] rounded-xl text-zinc-400 text-xs">
              No variables created yet. Add one to supply server values to desktop clients.
            </div>
          ) : (
            vars.map(v => (
              <div
                key={v.id}
                className="bg-[#16171c] border border-[#22242b] rounded-xl p-4 flex items-start justify-between hover:border-[#2f313c] transition-all gap-4"
              >
                <div className="flex items-start gap-3 flex-1 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-mono text-xs font-bold text-white truncate">
                      {v.key}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-400 mt-1 bg-[#111216] border border-[#262835] rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                      {v.value}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(v.id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors shrink-0"
                  title="Delete Variable"
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
