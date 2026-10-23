import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Trash2, Pause, Play, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import api from '../lib/api';

interface Tier {
  id: string;
  name: string;
  appId: string;
  paused: boolean;
  createdAt: string;
}

export const Subscriptions: React.FC = () => {
  const { currentApp } = useApp();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [newTierName, setNewTierName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTiers = useCallback(async () => {
    if (!currentApp) return;
    setLoading(true);
    try {
      const res = await api.get<Tier[]>(`/api/apps/${currentApp.id}/tiers`);
      if (Array.isArray(res.data)) setTiers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentApp]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp || !newTierName.trim()) return;
    await api.post(`/api/apps/${currentApp.id}/tiers`, { name: newTierName.trim() });
    setNewTierName('');
    await fetchTiers();
  };

  const handleTogglePause = async (tier: Tier) => {
    if (!currentApp) return;
    await api.patch(`/api/apps/${currentApp.id}/tiers/${tier.id}/pause`);
    await fetchTiers();
  };

  const handleDelete = async (tierId: string) => {
    if (!currentApp) return;
    if (!confirm('Are you sure you want to delete this subscription tier?')) return;
    await api.delete(`/api/apps/${currentApp.id}/tiers/${tierId}`);
    await fetchTiers();
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Subscriptions" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Subscription Tiers
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure subscription levels for your license keys and users. Pausing a tier blocks all users belonging to that tier.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create tier form */}
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-400" />
            Add New Subscription Tier
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Tier Name</label>
              <input
                type="text"
                required
                value={newTierName}
                onChange={e => setNewTierName(e.target.value)}
                placeholder="e.g. Standard, Pro, Lifetime"
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all"
            >
              Create Tier
            </button>
          </form>
        </div>

        {/* List of tiers */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-500 text-xs py-8 text-center">Loading tiers...</div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#22242b] rounded-xl text-zinc-400 text-xs">
              No tiers created yet.
            </div>
          ) : (
            tiers.map(t => (
              <div
                key={t.id}
                className="bg-[#16171c] border border-[#22242b] rounded-xl p-4 flex items-center justify-between hover:border-[#2f313c] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{t.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                        t.paused ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {t.paused ? 'PAUSED' : 'ACTIVE'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      Controls access for keys assigned to level "{t.name}"
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePause(t)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#22242e] text-zinc-300 hover:text-white hover:bg-amber-600 transition-colors flex items-center gap-1"
                  >
                    {t.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{t.paused ? 'Unpause' : 'Pause'}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
