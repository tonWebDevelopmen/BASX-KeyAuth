import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Pause,
  Play,
  Download,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  Clock,
  Search,
  X,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Monitor,
  Info,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

export interface LicenseKey {
  id: string;
  value: string;
  appId: string;
  level: string;
  expiryDays: number;
  durationSeconds?: number;
  expiryUnit?: 'Seconds' | 'Minutes' | 'Hours' | 'Days' | 'Weeks' | 'Months' | 'Years' | 'Lifetime';
  expiryDuration?: number;
  expiresAt?: string | null;
  hwidAffected: boolean;
  hwid?: string | null;
  note?: string;
  used: boolean;
  paused: boolean;
  usedBy?: string;
  usedOn?: string;
  generatedBy?: string;
  createdAt: string;
}

export const Licenses: React.FC = () => {
  const { currentApp } = useApp();
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'used' | 'unused' | 'paused' | 'expired'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // In-app dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: '', description: '', action: async () => {} });

  const [showLearnModal, setShowLearnModal] = useState(false);

  // Generate modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [genMask, setGenMask] = useState('BasX-******');
  const [genAmount, setGenAmount] = useState(1);
  const [genLevel, setGenLevel] = useState('1 (default)');
  const [genExpiryUnit, setGenExpiryUnit] = useState<string>('Days');
  const [genExpiryDuration, setGenExpiryDuration] = useState<number>(3);
  const [genHwidAffected, setGenHwidAffected] = useState<boolean>(true);
  const [genNote, setGenNote] = useState('');
  const [generating, setGenerating] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchKeys = useCallback(async () => {
    if (!currentApp) return;
    setLoading(true);
    try {
      const res = await api.get<LicenseKey[]>(`/api/apps/${currentApp.id}/keys`);
      if (Array.isArray(res.data)) {
        setKeys(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch keys:', err);
    } finally {
      setLoading(false);
    }
  }, [currentApp]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCopy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    showToast(`Copied license key: ${value}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTogglePause = async (key: LicenseKey) => {
    if (!currentApp) return;
    try {
      await api.patch(`/api/apps/${currentApp.id}/keys/${key.id}/pause`);
      await fetchKeys();
      showToast(key.paused ? 'License unpaused' : 'License paused');
    } catch {
      showToast('Failed to toggle pause status');
    }
    setActiveMenuId(null);
  };

  const handleResetKeyHwid = async (key: LicenseKey) => {
    if (!currentApp) return;
    try {
      await api.patch(`/api/apps/${currentApp.id}/keys/${key.id}/reset-hwid`);
      await fetchKeys();
      showToast(`HWID reset for license: ${key.value}`);
    } catch {
      showToast('Failed to reset HWID');
    }
    setActiveMenuId(null);
  };

  const handleResetAllHwids = () => {
    if (!currentApp) return;
    setConfirmDialog({
      open: true,
      title: 'Reset All License HWIDs',
      description: 'Are you sure you want to reset HWID locks on ALL keys in this application? Users will be able to bind to their next computer upon login.',
      action: async () => {
        try {
          const res = await api.post(`/api/apps/${currentApp.id}/keys/reset-all-hwid`);
          await fetchKeys();
          showToast(res.data?.message || 'All HWIDs successfully reset');
        } catch {
          showToast('Failed to reset all HWIDs');
        }
      },
    });
  };

  const handleDeleteKey = (keyId: string) => {
    if (!currentApp) return;
    setConfirmDialog({
      open: true,
      title: 'Delete License Key',
      description: 'Are you sure you want to permanently delete this license key? This action cannot be reversed.',
      action: async () => {
        try {
          await api.delete(`/api/apps/${currentApp.id}/keys/${keyId}`);
          setSelectedIds(prev => prev.filter(id => id !== keyId));
          await fetchKeys();
          showToast('License key deleted');
        } catch {
          showToast('Failed to delete license key');
        }
      },
    });
    setActiveMenuId(null);
  };

  const handleBulkDelete = () => {
    if (!currentApp || selectedIds.length === 0) return;
    setConfirmDialog({
      open: true,
      title: 'Delete Selected License Keys',
      description: `Are you sure you want to permanently delete ${selectedIds.length} selected license keys?`,
      action: async () => {
        try {
          await api.post(`/api/apps/${currentApp.id}/keys/bulk-delete`, { ids: selectedIds });
          setSelectedIds([]);
          await fetchKeys();
          showToast(`Deleted ${selectedIds.length} license keys`);
        } catch {
          showToast('Failed to bulk delete keys');
        }
      },
    });
  };

  const handleExportKeys = () => {
    if (keys.length === 0) {
      showToast('No license keys available to export');
      return;
    }
    const text = keys
      .map(
        k =>
          `${k.value} | Level: ${k.level} | HWID-Locked: ${k.hwidAffected !== false ? 'YES' : 'NO'} | Duration: ${k.expiryDuration || k.expiryDays} ${k.expiryUnit || 'Days'} | Used: ${k.used ? 'YES' : 'NO'}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentApp?.name || 'app'}_licenses_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${keys.length} license keys`);
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp) return;
    setGenerating(true);
    try {
      await api.post(`/api/apps/${currentApp.id}/keys/generate`, {
        mask: genMask,
        amount: genAmount,
        level: genLevel,
        expiryUnit: genExpiryUnit,
        expiryDuration: genExpiryUnit === 'Lifetime' ? -1 : genExpiryDuration,
        hwidAffected: genHwidAffected,
        note: genNote,
      });
      await fetchKeys();
      setShowGenModal(false);
      setGenAmount(1);
      setGenNote('');
      showToast(`Successfully generated ${genAmount} license key(s)!`);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to generate keys');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredKeys.map(k => k.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const isKeyExpired = (k: LicenseKey) => {
    if (k.expiryUnit === 'Lifetime' || k.expiryDays === -1) return false;
    if (k.expiresAt) {
      return new Date(k.expiresAt).getTime() <= Date.now();
    }
    return false;
  };

  const filteredKeys = keys.filter(k => {
    const expired = isKeyExpired(k);
    const matchesSearch =
      k.value.toLowerCase().includes(search.toLowerCase()) ||
      (k.usedBy && k.usedBy.toLowerCase().includes(search.toLowerCase())) ||
      (k.note && k.note.toLowerCase().includes(search.toLowerCase()));

    if (filterStatus === 'expired') return matchesSearch && expired;
    if (filterStatus === 'used') return matchesSearch && k.used && !expired;
    if (filterStatus === 'unused') return matchesSearch && !k.used && !expired;
    if (filterStatus === 'paused') return matchesSearch && k.paused;
    return matchesSearch;
  });

  const formatKeyDuration = (k: LicenseKey) => {
    if (k.expiryUnit === 'Lifetime' || k.expiryDays === -1) return 'Lifetime';
    if (k.expiryUnit && k.expiryDuration) {
      return `${k.expiryDuration} ${k.expiryUnit}`;
    }
    if (k.expiryDays >= 365) return `${Math.floor(k.expiryDays / 365)} Year(s)`;
    if (k.expiryDays >= 30) return `${Math.floor(k.expiryDays / 30)} Month(s)`;
    return `${k.expiryDays} Day(s)`;
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Licenses" />

      {/* Floating Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1f2029] border border-orange-500/40 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-orange-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Licenses</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Licenses allow your users to authenticate and register on your application.{' '}
          <button
            onClick={() => setShowLearnModal(true)}
            className="text-orange-400 hover:underline font-semibold cursor-pointer"
          >
            Learn More.
          </button>
        </p>
      </div>

      {/* Search and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search licenses, keys, users, notes..."
            className="w-full bg-[#16171c] border border-[#22242b] rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          {/* Filter Status Selector */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="bg-[#18191e] border border-[#262832] text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="unused">Unused Only</option>
              <option value="used">Used Only</option>
              <option value="expired">Expired / หมดอายุ</option>
              <option value="paused">Paused Only</option>
            </select>
          </div>

          {/* Reset All HWID */}
          <button
            onClick={handleResetAllHwids}
            title="Reset HWID for All Keys"
            className="px-3 py-2 rounded-lg bg-[#18191e] border border-[#262832] text-zinc-300 hover:text-white hover:border-orange-500/50 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden md:inline">Reset All HWIDs</span>
          </button>

          {/* Grid / Table View toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            title="Toggle View Mode"
            className="p-2 rounded-lg bg-[#18191e] border border-[#262832] text-zinc-400 hover:text-white hover:border-[#383a48] transition-colors cursor-pointer"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>

          {/* Generate Keys Button */}
          <button
            onClick={() => setShowGenModal(true)}
            title="Generate New License Keys"
            className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Generate Keys</span>
          </button>

          {/* Export button */}
          <button
            onClick={handleExportKeys}
            title="Export License Keys to File"
            className="p-2 rounded-lg bg-[#18191e] border border-[#262832] text-zinc-400 hover:text-white hover:border-[#383a48] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Delete selected button */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              title={`Delete ${selectedIds.length} Selected Keys`}
              className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Select All Checkbox */}
      <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filteredKeys.length > 0 && selectedIds.length === filteredKeys.length}
            onChange={handleSelectAll}
            className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
          />
          <span className="font-medium text-zinc-300">Select All</span>
        </label>
        <span className="font-mono text-[11px] text-zinc-500">
          Showing {filteredKeys.length} of {keys.length} keys
        </span>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="py-24 text-center text-zinc-400 text-xs">Loading licenses...</div>
      ) : filteredKeys.length === 0 ? (
        <div className="bg-[#16171c] border border-dashed border-[#262835] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No licenses generated yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            You haven't generated any license keys for{' '}
            <span className="text-orange-400 font-semibold">{currentApp?.name || 'this app'}</span> yet.
            Click below to generate single or bulk licenses with customizable duration and HWID protection.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowGenModal(true)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Generate License Keys</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View matching image_4b35dcd2.png */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredKeys.map(k => {
            const isSelected = selectedIds.includes(k.id);
            const expired = isKeyExpired(k);

            return (
              <div
                key={k.id}
                className={`bg-[#16171c] border rounded-xl p-4 space-y-3 transition-all relative ${
                  isSelected
                    ? 'border-orange-500 bg-[#191b22] ring-1 ring-orange-500/30'
                    : 'border-[#22242b] hover:border-[#2f313c]'
                }`}
              >
                {/* Top Row: Checkbox, Key string, Status badge, 3-dots */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(k.id)}
                      className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5 shrink-0"
                    />
                    <span
                      onClick={() => handleCopy(k.value, k.id)}
                      className="font-mono text-xs font-bold text-white hover:text-orange-400 cursor-pointer truncate transition-colors flex items-center gap-1.5"
                      title="Click to copy key"
                    >
                      {k.value}
                      {copiedId === k.id ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-500 opacity-60 hover:opacity-100 shrink-0" />
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        k.paused
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : expired
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : k.used
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                      }`}
                    >
                      {k.paused ? 'Paused' : expired ? 'คีย์หมดอายุ (Expired)' : k.used ? 'Used' : 'Unused'}
                    </span>

                    {/* 3-dots menu button */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === k.id ? null : k.id)}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#22242e] transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {activeMenuId === k.id && (
                        <div className="absolute right-0 top-7 w-40 bg-[#1b1c23] border border-[#2c2e3c] rounded-lg shadow-2xl p-1 z-30 text-xs space-y-0.5">
                          <button
                            onClick={() => handleCopy(k.value, k.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded text-zinc-300 hover:bg-[#252733] hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Key</span>
                          </button>
                          <button
                            onClick={() => handleResetKeyHwid(k)}
                            className="w-full text-left px-2.5 py-1.5 rounded text-zinc-300 hover:bg-[#252733] hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-orange-400" />
                            <span>Reset HWID</span>
                          </button>
                          <button
                            onClick={() => handleTogglePause(k)}
                            className="w-full text-left px-2.5 py-1.5 rounded text-zinc-300 hover:bg-[#252733] hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            {k.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                            <span>{k.paused ? 'Unpause' : 'Pause'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Key</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details 2-Column Section */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 border-t border-[#1e2029] pt-2.5">
                  <div className="space-y-1">
                    <div>
                      <span className="text-zinc-500">Created: </span>
                      <span className="text-zinc-300 font-mono text-[10px]">{formatDate(k.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">HWID Lock: </span>
                      <span className={k.hwidAffected !== false ? 'text-orange-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                        {k.hwidAffected !== false ? (k.hwid ? 'Bound (Locked)' : 'Enabled') : 'No Lock (Multi-Device)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Note: </span>
                      <span className="text-zinc-300">{k.note || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-right sm:text-left">
                    <div>
                      <span className="text-zinc-500">Duration: </span>
                      <span className="text-orange-400 font-semibold">{formatKeyDuration(k)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Used by: </span>
                      <span className="text-zinc-300">{k.usedBy || 'Not used'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Expires: </span>
                      <span className="text-zinc-300 font-mono text-[10px]">
                        {k.expiresAt ? formatDate(k.expiresAt) : k.expiryDays === -1 || k.expiryUnit === 'Lifetime' ? 'Lifetime' : 'On activation'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121316] border-b border-[#22242b] text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredKeys.length > 0 && selectedIds.length === filteredKeys.length}
                    onChange={handleSelectAll}
                    className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="p-3">License Key</th>
                <th className="p-3">Level</th>
                <th className="p-3">Duration</th>
                <th className="p-3">HWID Lock</th>
                <th className="p-3">Status</th>
                <th className="p-3">Used By</th>
                <th className="p-3">Expires</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2029]">
              {filteredKeys.map(k => {
                const expired = isKeyExpired(k);
                return (
                  <tr key={k.id} className="hover:bg-[#191a22] transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(k.id)}
                        onChange={() => handleToggleSelectOne(k.id)}
                        className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-white flex items-center gap-2">
                      <span>{k.value}</span>
                      <button onClick={() => handleCopy(k.value, k.id)} className="text-zinc-400 hover:text-orange-400 cursor-pointer">
                        {copiedId === k.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                        {k.level}
                      </span>
                    </td>
                    <td className="p-3 text-orange-400 font-semibold">{formatKeyDuration(k)}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        k.hwidAffected !== false ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {k.hwidAffected !== false ? (k.hwid ? 'Locked' : 'Enabled') : 'No Lock'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          k.paused
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : expired
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : k.used
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                        }`}
                      >
                        {k.paused ? 'Paused' : expired ? 'คีย์หมดอายุ' : k.used ? 'Used' : 'Unused'}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-300 font-mono">{k.usedBy || '-'}</td>
                    <td className="p-3 text-zinc-400 font-mono text-[11px]">
                      {k.expiresAt ? formatDate(k.expiresAt) : k.expiryDays === -1 || k.expiryUnit === 'Lifetime' ? 'Lifetime' : 'On activation'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleResetKeyHwid(k)}
                          title="Reset HWID"
                          className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-orange-400 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleTogglePause(k)}
                          title={k.paused ? 'Unpause' : 'Pause'}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        >
                          {k.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          title="Delete Key"
                          className="p-1.5 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Generate License Keys (Matches User Request: HWID Affected checkbox, all Expiry Units, No Lowercase/Uppercase buttons) */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#18191e] border border-[#2b2d39] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242633] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-orange-400" />
                Create a new license
              </h3>
              <button
                onClick={() => setShowGenModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div className="space-y-3">
                {/* License Amount */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">
                      License Amount <span className="text-rose-500">*</span>
                    </label>
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                  <input
                    type="number"
                    min={1}
                    required
                    value={genAmount}
                    onChange={e => setGenAmount(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                {/* License Mask */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">
                      License Mask <span className="text-rose-500">*</span>
                    </label>
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={genMask}
                    onChange={e => setGenMask(e.target.value)}
                    placeholder="BasX-******"
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[10px] text-zinc-500">Use * or X for randomized characters (e.g. BasX-******)</p>
                </div>

                {/* Subscription Level */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">
                      Subscription Level <span className="text-rose-500">*</span>
                    </label>
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={genLevel}
                    onChange={e => setGenLevel(e.target.value)}
                    placeholder="1 (default)"
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* License Note */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">License Note</label>
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    value={genNote}
                    onChange={e => setGenNote(e.target.value)}
                    placeholder="Optional memo or customer identifier"
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Expiry Unit & Duration (Matches KeyAuth image_59fe4cc6.png) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Expiry Unit <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={genExpiryUnit}
                      onChange={e => setGenExpiryUnit(e.target.value)}
                      className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="Seconds">Seconds (วินาที)</option>
                      <option value="Minutes">Minutes (นาที)</option>
                      <option value="Hours">Hours (ชั่วโมง)</option>
                      <option value="Days">Days (วัน)</option>
                      <option value="Weeks">Weeks (อาทิตย์/สัปดาห์)</option>
                      <option value="Months">Months (เดือน)</option>
                      <option value="Years">Years (ปี)</option>
                      <option value="Lifetime">Lifetime (ตลอดชีพ)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Expiry Duration <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      disabled={genExpiryUnit === 'Lifetime'}
                      required={genExpiryUnit !== 'Lifetime'}
                      value={genExpiryUnit === 'Lifetime' ? '' : genExpiryDuration}
                      onChange={e => setGenExpiryDuration(parseInt(e.target.value) || 1)}
                      placeholder={genExpiryUnit === 'Lifetime' ? 'Unlimited' : '3'}
                      className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono disabled:opacity-40"
                    />
                  </div>
                </div>

                {/* HWID Affected Toggle (Requested in place of Lowercase/Uppercase buttons!) */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-[#111216] border border-[#282a35] cursor-pointer hover:border-orange-500/40 transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={genHwidAffected}
                      onChange={e => setGenHwidAffected(e.target.checked)}
                      className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">HWID Affected (ล็อคเครื่อง)</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          genHwidAffected ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {genHwidAffected ? 'Single Machine Lock' : 'Multi-Device Allowed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {genHwidAffected
                          ? 'ติ๊กเปิด: คีย์จะล็อคกับเครื่องแรกที่ใช้งาน หากเครื่องอื่นนำไปใช้จะขึ้น HWID Mismatch'
                          : 'ไม่ติ๊ก: คีย์จะไม่ล็อคเครื่อง สามารถนำไปใช้ได้หลายคนหลายเครื่องพร้อมกัน'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#242633]">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all cursor-pointer"
                >
                  {generating ? 'Creating...' : 'Create License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL (Replaces all blocked window.confirm calls) */}
      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#18191e] border border-[#2b2d39] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{confirmDialog.description}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#242633]">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const act = confirmDialog.action;
                  setConfirmDialog(prev => ({ ...prev, open: false }));
                  await act();
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEARN MORE MODAL */}
      {showLearnModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#18191e] border border-[#2b2d39] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242633] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-orange-400" />
                License Key Architecture & HWID Management
              </h3>
              <button onClick={() => setShowLearnModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                <strong>License Duration & Expiry:</strong> When a key is created with Seconds, Minutes, Hours, Days, Weeks, Months, or Years, the countdown activates automatically upon first license authentication or user registration. When elapsed, any client check returns <span className="text-rose-400">Key has expired / คีย์หมดอายุ</span>.
              </p>
              <p>
                <strong>HWID Affected (Hardware Locking):</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li><strong className="text-orange-400">Enabled:</strong> The license permanently locks to the first machine HWID hash. Secondary machines are rejected with "HWID Doesn't match".</li>
                <li><strong className="text-emerald-400">Disabled:</strong> The key has no hardware lock and can be shared across multiple computers simultaneously.</li>
              </ul>
              <p>
                <strong>Reset HWID:</strong> Developers can reset individual or all license HWIDs anytime with a single click.
              </p>
            </div>
            <div className="flex justify-end pt-2 border-t border-[#242633]">
              <button
                onClick={() => setShowLearnModal(false)}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
