import React, { useState } from 'react';
import { Settings, Key, RefreshCw, AlertTriangle, Trash2, Check, Copy, Shield, Pause, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import api from '../lib/api';

export const AppSettings: React.FC = () => {
  const { currentApp, refreshApps } = useApp();
  const { owner, regenerateSellerKey } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  // App edit fields
  const [name, setName] = useState(currentApp?.name || '');
  const [version, setVersion] = useState(currentApp?.version || '1.0');
  const [description, setDescription] = useState(currentApp?.description || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleCopySeller = () => {
    if (owner?.sellerKey) {
      navigator.clipboard.writeText(owner.sellerKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleRegenSeller = async () => {
    if (!confirm('Are you sure you want to regenerate your Seller API Key? Any external automation or seller bots using your old key will stop working.')) return;
    setRegenLoading(true);
    await regenerateSellerKey();
    setRegenLoading(false);
  };

  const handleSaveAppInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp) return;
    await api.patch(`/api/apps/${currentApp.id}/rename`, { name });
    await api.patch(`/api/apps/${currentApp.id}/description`, { description, version });
    await refreshApps();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTogglePause = async () => {
    if (!currentApp) return;
    await api.patch(`/api/apps/${currentApp.id}/pause`);
    await refreshApps();
  };

  const handleDeleteApp = async () => {
    if (!currentApp) return;
    if (!confirm(`DANGER: Are you sure you want to permanently delete application "${currentApp.name}"? This cannot be undone.`)) return;
    await api.delete(`/api/apps/${currentApp.id}`);
    await refreshApps();
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Application Settings" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Application & Account Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure application details, version management, Seller API keys, and operational controls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Configuration */}
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-400" />
            General Information
          </h2>

          <form onSubmit={handleSaveAppInfo} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Application Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Enforced Binary Version</label>
              <input
                type="text"
                required
                value={version}
                onChange={e => setVersion(e.target.value)}
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all flex items-center gap-1.5"
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{savedSuccess ? 'Saved Successfully!' : 'Save Application Info'}</span>
              </button>

              <button
                type="button"
                onClick={handleTogglePause}
                className="px-4 py-2 rounded-lg bg-[#22242e] hover:bg-amber-600 hover:text-white text-zinc-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {currentApp?.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{currentApp?.paused ? 'Unpause App' : 'Pause App'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Seller API & Account Keys */}
        <div className="space-y-6">
          <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-orange-400" />
              Developer Seller API Credentials
            </h2>
            <p className="text-xs text-zinc-400">
              The Seller API key allows server-to-server calls to automate key generation, user bans, and HWID resets via header <code className="text-orange-400 font-mono">x-seller-key</code>.
            </p>

            <div className="p-3 bg-[#111216] border border-[#262835] rounded-lg space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                <span>Account Seller Key:</span>
                <button
                  onClick={handleCopySeller}
                  className="text-orange-400 hover:text-orange-300 text-xs flex items-center gap-1 font-sans"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
              <div className="font-mono text-xs text-white truncate select-all">
                {owner?.sellerKey || 'N/A'}
              </div>
            </div>

            <button
              onClick={handleRegenSeller}
              disabled={regenLoading}
              className="px-4 py-2 rounded-lg bg-[#22242e] hover:bg-orange-600 hover:text-white text-zinc-300 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{regenLoading ? 'Regenerating...' : 'Regenerate Seller Key'}</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-[#1b1416] border border-rose-900/40 rounded-xl p-6 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Danger Zone
            </h2>
            <p className="text-xs text-zinc-400">
              Deleting this application will permanently remove all associated license keys, users, active client sessions, variables, and blacklist rules.
            </p>
            <button
              onClick={handleDeleteApp}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Application</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
