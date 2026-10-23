import React, { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  ShieldBan,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  X,
  Lock,
  Cpu,
  Globe,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

export interface AppUser {
  id: string;
  username: string;
  email?: string;
  hwid?: string | null;
  ip?: string;
  banned: boolean;
  appId: string;
  lastLogin?: string;
  createdAt: string;
  subscriptions?: { id: string; tier: string; expiresAt: string | null }[];
}

export const Users: React.FC = () => {
  const { currentApp } = useApp();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Add User modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTier, setNewTier] = useState('default');
  const [newExpiryDays, setNewExpiryDays] = useState(30);
  const [creatingUser, setCreatingUser] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchUsers = useCallback(async () => {
    if (!currentApp) return;
    setLoading(true);
    try {
      const res = await api.get<AppUser[]>(`/api/apps/${currentApp.id}/users`);
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [currentApp]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleBan = async (user: AppUser) => {
    if (!currentApp) return;
    await api.patch(`/api/apps/${currentApp.id}/users/${user.id}/ban`);
    await fetchUsers();
    setActiveMenuId(null);
  };

  const handleResetHwid = async (user: AppUser) => {
    if (!currentApp) return;
    await api.patch(`/api/apps/${currentApp.id}/users/${user.id}/reset-hwid`);
    await fetchUsers();
    setActiveMenuId(null);
  };

  const handleResetAllHwid = async () => {
    if (!currentApp) return;
    if (!confirm('Are you sure you want to reset HWID for ALL users in this application? This allows all users to log in from a new machine.')) return;
    await api.patch(`/api/apps/${currentApp.id}/users/reset-all-hwid`);
    await fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentApp) return;
    if (!confirm('Are you sure you want to delete this user?')) return;
    await api.delete(`/api/apps/${currentApp.id}/users/${userId}`);
    setSelectedIds(prev => prev.filter(id => id !== userId));
    await fetchUsers();
    setActiveMenuId(null);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp) return;
    setAddError('');
    setCreatingUser(true);

    try {
      const res = await api.post(`/api/apps/${currentApp.id}/users/create`, {
        username: newUsername.trim(),
        password: newPassword,
        email: newEmail.trim() || undefined,
        tier: newTier,
        expiryDays: newExpiryDays,
      });

      if (res.error) {
        setAddError(res.error);
      } else {
        await fetchUsers();
        setShowAddModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewEmail('');
      }
    } catch (err: any) {
      setAddError(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredUsers.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.ip && u.ip.includes(search)) ||
      (u.hwid && u.hwid.toLowerCase().includes(search.toLowerCase()));

    if (filterStatus === 'active') return matchesSearch && !u.banned;
    if (filterStatus === 'banned') return matchesSearch && u.banned;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Users" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Users
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          After someone registers for your app with a license, they will appear here.{' '}
          <a href="#learn" onClick={(e) => { e.preventDefault(); alert("Users are registered through your desktop client via license keys, or created manually by developers. Their machine HWID is locked automatically."); }} className="text-orange-400 hover:underline">
            Learn More.
          </a>
        </p>
      </div>

      {/* Search and Action Toolbar (Matching image_57484c1b.png) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Users..."
            className="w-full bg-[#16171c] border border-[#22242b] rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* Filter Status Selector */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-[#18191e] border border-[#262832] text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="all">All Users</option>
            <option value="active">Active Only</option>
            <option value="banned">Banned Only</option>
          </select>

          {/* Grid / List View toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            title="Toggle View Mode"
            className="p-2 rounded-lg bg-[#18191e] border border-[#262832] text-zinc-400 hover:text-white hover:border-[#383a48] transition-colors"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>

          {/* Add User Button */}
          <button
            onClick={() => setShowAddModal(true)}
            title="Add User Manually"
            className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden md:inline">Add User</span>
          </button>

          {/* Reset All HWID */}
          <button
            onClick={handleResetAllHwid}
            title="Reset HWID for All Users"
            className="p-2 rounded-lg bg-[#18191e] border border-[#262832] text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Select All Checkbox */}
      <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
            onChange={handleSelectAll}
            className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
          />
          <span className="font-medium text-zinc-300">Select All</span>
        </label>
        <span className="font-mono text-[11px] text-zinc-500">
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="py-24 text-center text-zinc-400 text-xs">
          Loading users...
        </div>
      ) : filteredUsers.length === 0 ? (
        /* Empty State per user request */
        <div className="bg-[#16171c] border border-dashed border-[#262835] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-400">
            <UsersIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No registered users yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            When users register on your client desktop app with a license key, they will appear here with automatic HWID lock and IP tracking. You can also add users manually.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add User Manually</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View matching image_57484c1b.png */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map(u => {
            const isSelected = selectedIds.includes(u.id);
            return (
              <div
                key={u.id}
                className={`bg-[#16171c] border rounded-xl p-4 space-y-3 transition-all relative ${
                  isSelected
                    ? 'border-orange-500 bg-[#191b22] ring-1 ring-orange-500/30'
                    : 'border-[#22242b] hover:border-[#2f313c]'
                }`}
              >
                {/* Top Row: Checkbox, Username, Status badge, 3-dots */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(u.id)}
                      className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5 shrink-0"
                    />
                    <span className="font-mono text-xs font-bold text-white truncate">
                      {u.username}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        u.banned
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      Status: {u.banned ? 'Banned' : 'Active'}
                    </span>

                    {/* 3-dots Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === u.id ? null : u.id)}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#22242e] transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {activeMenuId === u.id && (
                        <div className="absolute right-0 top-7 w-36 bg-[#1b1c23] border border-[#2c2e3c] rounded-lg shadow-2xl p-1 z-30 text-xs">
                          <button
                            onClick={() => handleToggleBan(u)}
                            className="w-full text-left px-2.5 py-1.5 rounded text-zinc-300 hover:bg-[#252733] hover:text-white transition-colors flex items-center gap-2"
                          >
                            {u.banned ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <ShieldBan className="w-3 h-3 text-rose-400" />}
                            <span>{u.banned ? 'Unban User' : 'Ban User'}</span>
                          </button>
                          <button
                            onClick={() => handleResetHwid(u)}
                            className="w-full text-left px-2.5 py-1.5 rounded text-zinc-300 hover:bg-[#252733] hover:text-white transition-colors flex items-center gap-2"
                          >
                            <RefreshCw className="w-3 h-3 text-orange-400" />
                            <span>Reset HWID</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete User</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details 2-Column Section matching image_57484c1b.png */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 border-t border-[#1e2029] pt-2.5">
                  <div className="space-y-1">
                    <div>
                      <span className="text-zinc-500">Created: </span>
                      <span className="text-zinc-300 font-mono text-[10px]">{formatDate(u.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">IP: </span>
                      <span className="text-zinc-300 font-mono text-[10px]">{u.ip || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Cooldown: </span>
                      <span className="text-zinc-300">N/A</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-right sm:text-left">
                    <div>
                      <span className="text-zinc-500">Last Login: </span>
                      <span className="text-zinc-300 font-mono text-[10px]">{u.lastLogin ? formatDate(u.lastLogin) : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">2FA: </span>
                      <span className="text-zinc-300">Disabled</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">HWID Affected: </span>
                      <span className={`font-semibold ${u.hwid ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {u.hwid ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* HWID hash display with quick reset */}
                {u.hwid && (
                  <div className="bg-[#111216] border border-[#22242f] rounded-lg px-2.5 py-1.5 text-[10px] font-mono flex items-center justify-between text-zinc-400">
                    <span className="truncate max-w-[190px]">HWID: {u.hwid}</span>
                    <button
                      onClick={() => handleResetHwid(u)}
                      className="text-orange-400 hover:text-orange-300 text-[10px] ml-1 shrink-0 font-sans"
                    >
                      Reset
                    </button>
                  </div>
                )}
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
                    checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                    onChange={handleSelectAll}
                    className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="p-3">Username</th>
                <th className="p-3">IP Address</th>
                <th className="p-3">HWID Locked</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Login</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2029]">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-[#191a22] transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={() => handleToggleSelectOne(u.id)}
                      className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="p-3 font-mono font-bold text-white">
                    {u.username}
                  </td>
                  <td className="p-3 font-mono text-zinc-400 text-[11px]">
                    {u.ip || '127.0.0.1'}
                  </td>
                  <td className="p-3">
                    {u.hwid ? (
                      <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                        <Check className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[11px]">Unlocked</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      u.banned ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {u.banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400 font-mono text-[11px]">
                    {u.lastLogin ? formatDate(u.lastLogin) : 'N/A'}
                  </td>
                  <td className="p-3 text-zinc-500 font-mono text-[11px]">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleResetHwid(u)}
                        className="p-1.5 rounded hover:bg-[#252733] text-zinc-400 hover:text-orange-400"
                        title="Reset HWID"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleBan(u)}
                        className="p-1.5 rounded hover:bg-[#252733] text-zinc-400 hover:text-white"
                        title={u.banned ? 'Unban' : 'Ban'}
                      >
                        {u.banned ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldBan className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Add User Manually */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#18191e] border border-[#2b2d39] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242633] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-orange-400" />
                Add User Manually
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Email (Optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Subscription Tier</label>
                  <input
                    type="text"
                    value={newTier}
                    onChange={e => setNewTier(e.target.value)}
                    placeholder="default"
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Duration (Days)</label>
                  <select
                    value={newExpiryDays}
                    onChange={e => setNewExpiryDays(parseInt(e.target.value))}
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={365}>1 Year</option>
                    <option value={-1}>Lifetime</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#242633]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
