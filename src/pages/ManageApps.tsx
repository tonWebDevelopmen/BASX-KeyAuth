import React, { useState } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Plus,
  Pencil,
  FileEdit,
  Pause,
  Play,
  Trash2,
  AlertCircle,
  Search,
  Code2,
  Layers,
  Activity,
  ShieldCheck,
  X
} from 'lucide-react';
import { useApp, Application } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import api from '../lib/api';

export const ManageApps: React.FC = () => {
  const { apps, currentApp, selectApp, refreshApps, createApp } = useApp();
  const { owner } = useAuth();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [snippetLang, setSnippetLang] = useState<'cpp' | 'csharp' | 'python' | 'node'>('python');
  const [appSearch, setAppSearch] = useState('');
  const [filterStanding, setFilterStanding] = useState('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppVersion, setNewAppVersion] = useState('1.0');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Application | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [showDescModal, setShowDescModal] = useState(false);
  const [descTarget, setDescTarget] = useState<Application | null>(null);
  const [descValue, setDescValue] = useState('');
  const [versionValue, setVersionValue] = useState('');

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRefreshSecret = async () => {
    if (!currentApp) return;
    if (!confirm('Are you sure you want to regenerate the application secret? Clients using this secret must be updated.')) return;
    try {
      await api.patch(`/api/apps/${currentApp.id}/secret`);
      await refreshApps();
    } catch (err) {
      alert('Failed to regenerate secret');
    }
  };

  const handleTogglePause = async (app: Application) => {
    try {
      await api.patch(`/api/apps/${app.id}/pause`);
      await refreshApps();
    } catch (err) {
      alert('Failed to toggle pause');
    }
  };

  const handleDeleteApp = async (app: Application) => {
    if (!confirm(`Are you sure you want to delete application "${app.name}"? This will permanently delete all associated keys, users, and data.`)) return;
    try {
      await api.delete(`/api/apps/${app.id}`);
      await refreshApps();
    } catch (err) {
      alert('Failed to delete application');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newAppName.trim()) {
      setCreateError('Application name is required');
      return;
    }
    setCreateLoading(true);
    const res = await createApp(newAppName.trim(), newAppVersion.trim(), newAppDesc.trim());
    setCreateLoading(false);
    if (!res.success) {
      setCreateError(res.error || 'Failed to create application');
    } else {
      setShowCreateModal(false);
      setNewAppName('');
      setNewAppDesc('');
      setNewAppVersion('1.0');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    await api.patch(`/api/apps/${renameTarget.id}/rename`, { name: renameValue.trim() });
    await refreshApps();
    setShowRenameModal(false);
  };

  const handleDescSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descTarget) return;
    await api.patch(`/api/apps/${descTarget.id}/description`, {
      description: descValue.trim(),
      version: versionValue.trim(),
    });
    await refreshApps();
    setShowDescModal(false);
  };

  // Stats
  const totalAppsCount = apps.length;
  const activeAppsCount = apps.filter(a => !a.paused).length;
  const pausedAppsCount = apps.filter(a => a.paused).length;
  const activeSessionsCount = apps.reduce((acc, a) => acc + (a.onlineUsers || 0), 0);

  const filteredApps = apps.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(appSearch.toLowerCase());
    if (filterStanding === 'active') return matchesSearch && !a.paused;
    if (filterStanding === 'paused') return matchesSearch && a.paused;
    return matchesSearch;
  });

  const getCodeSnippet = () => {
    const appName = currentApp?.name || 'AppName';
    const ownerId = owner?.id || 'OwnerId';
    const appVersion = currentApp?.version || '1.0';

    if (snippetLang === 'python') {
      return `import requests

class BasxAuth:
    def __init__(self, name, ownerid, version):
        self.name = name
        self.ownerid = ownerid
        self.version = version
        self.sessionid = None
        self.base_url = "http://localhost:3000/api/v1/client"
        self.init()

    def init(self):
        res = requests.post(self.base_url, json={
            "type": "init",
            "name": self.name,
            "ownerid": self.ownerid,
            "ver": self.version
        }).json()
        if res.get("success"):
            self.sessionid = res["sessionid"]
            print(f"[*] Initialized session: {self.sessionid}")
        else:
            print(f"[!] Init failed: {res.get('message')}")

    def license(self, key, hwid="DEFAULT_HWID_HASH"):
        res = requests.post(self.base_url, json={
            "type": "license",
            "key": key,
            "hwid": hwid,
            "sessionid": self.sessionid
        }).json()
        return res

# Usage:
app = BasxAuth(name="${appName}", ownerid="${ownerId}", version="${appVersion}")
auth_result = app.license("BASX-XXXX-XXXX-XXXX")
print(auth_result)`;
    }

    if (snippetLang === 'cpp') {
      return `#include <iostream>
#include <string>
#include <cpr/cpr.h> // Modern C++ HTTP library
#include <nlohmann/json.hpp>

using json = nlohmann::json;

class BasxAuthApp {
public:
    std::string name = "${appName}";
    std::string ownerid = "${ownerId}";
    std::string version = "${appVersion}";
    std::string sessionid;
    std::string endpoint = "http://localhost:3000/api/v1/client";

    bool init() {
        json payload = {{"type", "init"}, {"name", name}, {"ownerid", ownerid}, {"ver", version}};
        auto res = cpr::Post(cpr::Url{endpoint}, cpr::Body{payload.dump()}, cpr::Header{{"Content-Type", "application/json"}});
        auto data = json::parse(res.text);
        if (data["success"].get<bool>()) {
            sessionid = data["sessionid"].get<std::string>();
            return true;
        }
        return false;
    }
};

int main() {
    BasxAuthApp app;
    if (app.init()) {
        std::cout << "Handshake verified with BasxAuth Service PRO!" << std::endl;
    }
    return 0;
}`;
    }

    if (snippetLang === 'csharp') {
      return `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class BasxAuthClient {
    private static readonly HttpClient client = new HttpClient();
    private string name = "${appName}";
    private string ownerId = "${ownerId}";
    private string version = "${appVersion}";
    private string sessionId;

    public async Task<bool> InitializeAsync() {
        var payload = new { type = "init", name, ownerid = ownerId, ver = version };
        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync("http://localhost:3000/api/v1/client", content);
        var json = await response.Content.ReadAsStringAsync();
        Console.WriteLine("Init Response: " + json);
        return true;
    }
}`;
    }

    return `const axios = require('axios');

async function testBasxAuth() {
  const initRes = await axios.post('http://localhost:3000/api/v1/client', {
    type: 'init',
    name: '${appName}',
    ownerid: '${ownerId}',
    ver: '${appVersion}'
  });

  console.log('Init response:', initRes.data);
  const sessionid = initRes.data.sessionid;

  // Authenticate with a License Key
  const authRes = await axios.post('http://localhost:3000/api/v1/client', {
    type: 'license',
    key: 'BASX-XXXX-XXXX-XXXX',
    hwid: 'DEVICE-HWID-SAMPLE',
    sessionid: sessionid
  });

  console.log('License Auth:', authRes.data);
}

testBasxAuth();`;
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Manage Applications" />

      {/* Page Title & Description */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Manage Applications
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your applications. Applications are the backbone of all the data.{' '}
          <a href="#learn" onClick={(e) => { e.preventDefault(); alert("BasxAuth Service PRO documentation: Each application represents a separate desktop program with independent licenses, users, tiers, and variables."); }} className="text-orange-400 hover:underline">
            Learn More.
          </a>
        </p>
      </div>

      {/* 4 Stat Cards in a row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Apps */}
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-lg shadow-black/20 hover:border-[#2f313c] transition-all">
          <span className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
            {totalAppsCount}
          </span>
          <span className="text-xs font-medium text-zinc-400 mt-1.5 uppercase tracking-wider">
            Total Apps
          </span>
        </div>

        {/* Active */}
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-lg shadow-black/20 hover:border-[#2f313c] transition-all">
          <span className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
            {activeAppsCount}
          </span>
          <span className="text-xs font-medium text-zinc-400 mt-1.5 uppercase tracking-wider">
            Active
          </span>
        </div>

        {/* Paused */}
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-lg shadow-black/20 hover:border-[#2f313c] transition-all">
          <span className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
            {pausedAppsCount}
          </span>
          <span className="text-xs font-medium text-zinc-400 mt-1.5 uppercase tracking-wider">
            Paused
          </span>
        </div>

        {/* Active Sessions */}
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-lg shadow-black/20 hover:border-[#2f313c] transition-all">
          <span className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
            {activeSessionsCount}
          </span>
          <span className="text-xs font-medium text-zinc-400 mt-1.5 uppercase tracking-wider">
            Active Sessions
          </span>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Application Credentials (5 cols) */}
        <div className="lg:col-span-5 bg-[#16171c] border border-[#22242b] rounded-xl p-6 shadow-xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Application Credentials
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Simply replace the placeholder code in the example with these
            </p>
          </div>

          {/* Toggle Switch: Display Code Snippet */}
          <div className="flex items-center gap-2 pt-1 pb-2">
            <button
              type="button"
              onClick={() => setShowCodeSnippet(!showCodeSnippet)}
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                showCodeSnippet ? 'bg-orange-500 justify-end' : 'bg-[#2a2c37] justify-start'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md"></div>
            </button>
            <span className="text-xs text-zinc-300 font-medium">Display Code Snippet</span>
          </div>

          {/* Code Snippet Box when toggled on */}
          {showCodeSnippet && (
            <div className="bg-[#0f1013] border border-[#252733] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#22242f] pb-2">
                <div className="flex gap-1">
                  {(['python', 'cpp', 'csharp', 'node'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setSnippetLang(lang)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold transition-colors ${
                        snippetLang === lang ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {lang === 'csharp' ? 'C#' : lang === 'cpp' ? 'C++' : lang}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => copyToClipboard(getCodeSnippet(), 'snippet')}
                  className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono"
                >
                  {copiedField === 'snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'snippet' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-56 p-1 scrollbar-thin">
                {getCodeSnippet()}
              </pre>
            </div>
          )}

          {/* APPLICATION NAME */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              APPLICATION NAME
            </label>
            <div className="flex items-center justify-between bg-[#111216] border border-[#262833] rounded-lg px-3 py-2 text-xs font-semibold text-white">
              <span className="truncate">{currentApp ? currentApp.name : 'No App Selected'}</span>
              <button
                onClick={() => copyToClipboard(currentApp?.name || '', 'name')}
                className="text-zinc-400 hover:text-orange-400 transition-colors ml-2"
                title="Copy Name"
              >
                {copiedField === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* ACCOUNT OWNER ID */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              ACCOUNT OWNER ID
            </label>
            <div className="flex items-center justify-between bg-[#111216] border border-[#262833] rounded-lg px-3 py-2 text-xs font-mono text-zinc-300">
              <span className="truncate">{owner ? owner.id : 'N/A'}</span>
              <button
                onClick={() => copyToClipboard(owner?.id || '', 'ownerId')}
                className="text-zinc-400 hover:text-orange-400 transition-colors ml-2"
                title="Copy Owner ID"
              >
                {copiedField === 'ownerId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* APPLICATION SECRET */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              APPLICATION SECRET
            </label>
            <div className="flex items-center justify-between bg-[#111216] border border-[#262833] rounded-lg px-3 py-2 text-xs font-mono text-zinc-300">
              <span className="truncate">{currentApp ? currentApp.secret : 'N/A'}</span>
              <button
                onClick={() => copyToClipboard(currentApp?.secret || '', 'secret')}
                className="text-zinc-400 hover:text-orange-400 transition-colors ml-2"
                title="Copy Secret"
              >
                {copiedField === 'secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* APPLICATION VERSION */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              APPLICATION VERSION
            </label>
            <div className="flex items-center justify-between bg-[#111216] border border-[#262833] rounded-lg px-3 py-2 text-xs font-mono text-zinc-300">
              <span>{currentApp ? currentApp.version : '1.0'}</span>
              <button
                onClick={() => copyToClipboard(currentApp?.version || '1.0', 'version')}
                className="text-zinc-400 hover:text-orange-400 transition-colors ml-2"
                title="Copy Version"
              >
                {copiedField === 'version' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Refresh Secret Button (Orange styled button per screenshot) */}
          <div className="pt-2">
            <button
              onClick={handleRefreshSecret}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-xs transition-all shadow-md shadow-orange-500/20 active:scale-[0.99]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Application Secret</span>
            </button>
          </div>

          {/* Notice Box (styled with dark orange / blue border as in screenshot) */}
          <div className="bg-[#121316] border border-orange-500/30 rounded-lg p-3 text-[11px] text-zinc-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-orange-400">Notice! </span>
              Application secrets are only displayed for users using our older API endpoints. If you're using our newer API (1.3), application secrets are not used!
            </div>
          </div>
        </div>

        {/* Right Column: My Applications (7 cols) */}
        <div className="lg:col-span-7 bg-[#16171c] border border-[#22242b] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white tracking-wide">
              My Applications
            </h2>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={appSearch}
                onChange={e => setAppSearch(e.target.value)}
                placeholder="Search applications..."
                className="w-full bg-[#111216] border border-[#272933] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Filter dropdown */}
          <div className="w-full sm:w-48">
            <select
              value={filterStanding}
              onChange={e => setFilterStanding(e.target.value)}
              className="w-full bg-[#111216] border border-[#272933] rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">All Applications</option>
              <option value="active">Active Only</option>
              <option value="paused">Paused Only</option>
            </select>
          </div>

          {/* BIG PRIMARY BUTTON: + Create Application */}
          {/* Exact color request: Change from blue to orange! */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Application</span>
          </button>

          {/* Application Cards List */}
          <div className="space-y-4 pt-2">
            {filteredApps.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#2b2d39] rounded-xl p-6">
                <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-zinc-300">No applications found</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Click the "+ Create Application" button above to add an application.
                </p>
              </div>
            ) : (
              filteredApps.map(app => {
                const isSelected = currentApp?.id === app.id;
                return (
                  <div
                    key={app.id}
                    className={`bg-[#121316] border rounded-xl p-5 space-y-4 transition-all shadow-md ${
                      isSelected ? 'border-orange-500/50 ring-1 ring-orange-500/20' : 'border-[#242631] hover:border-[#2f3140]'
                    }`}
                  >
                    {/* Header: Name and Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {app.name}
                        </h3>
                        {app.description && (
                          <span className="text-[11px] text-zinc-400 hidden sm:inline">
                            &bull; {app.description}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          app.paused
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {app.paused ? 'PAUSED' : 'ACTIVE'}
                      </span>
                    </div>

                    {/* Middle: 3 Metrics columns */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#1e2029] text-center">
                      <div>
                        <div className="text-[11px] text-zinc-500 uppercase tracking-wider">App Version</div>
                        <div className="text-sm font-bold text-white font-mono mt-0.5">{app.version}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-zinc-500 uppercase tracking-wider">Users</div>
                        <div className="text-sm font-bold text-white font-mono mt-0.5">{app._count?.users || 0}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-zinc-500 uppercase tracking-wider">Application Standing</div>
                        <div className="text-sm font-bold text-emerald-400 mt-0.5">
                          {app.standing || 'Good'}
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Action Buttons */}
                    {/* Selected (green), Rename (indigo), Edit Description (teal), Pause (amber), Delete (red) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {isSelected ? (
                        <button
                          disabled
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600/90 text-white font-bold text-xs flex items-center gap-1.5 cursor-default"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Selected</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => selectApp(app)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#22242e] hover:bg-orange-600 hover:text-white text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <span>Select</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setRenameTarget(app);
                          setRenameValue(app.name);
                          setShowRenameModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Rename</span>
                      </button>

                      <button
                        onClick={() => {
                          setDescTarget(app);
                          setDescValue(app.description || '');
                          setVersionValue(app.version || '1.0');
                          setShowDescModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#0891b2] hover:bg-[#0e7490] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Edit Description</span>
                      </button>

                      <button
                        onClick={() => handleTogglePause(app)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        {app.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        <span>{app.paused ? 'Unpause' : 'Pause'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteApp(app)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-xs flex items-center gap-1.5 transition-colors ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Create Application */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#18191e] border border-[#2b2d39] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242633] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-400" />
                Create New Application
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Application Name *</label>
                <input
                  type="text"
                  required
                  value={newAppName}
                  onChange={e => setNewAppName(e.target.value)}
                  placeholder="e.g. MySuperApp"
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Initial Version</label>
                <input
                  type="text"
                  value={newAppVersion}
                  onChange={e => setNewAppVersion(e.target.value)}
                  placeholder="1.0"
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Description</label>
                <textarea
                  value={newAppDesc}
                  onChange={e => setNewAppDesc(e.target.value)}
                  rows={2}
                  placeholder="Desktop tool description..."
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#232530]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all"
                >
                  {createLoading ? 'Creating...' : 'Create Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Rename Application */}
      {showRenameModal && renameTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#18191e] border border-[#2b2d39] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242633] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-400" />
                Rename Application
              </h3>
              <button onClick={() => setShowRenameModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">New Name</label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Description & Version */}
      {showDescModal && descTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#18191e] border border-[#2b2d39] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242633] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-cyan-400" />
                Edit App Details
              </h3>
              <button onClick={() => setShowDescModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDescSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Version</label>
                <input
                  type="text"
                  value={versionValue}
                  onChange={e => setVersionValue(e.target.value)}
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Description</label>
                <textarea
                  value={descValue}
                  onChange={e => setDescValue(e.target.value)}
                  rows={3}
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDescModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
