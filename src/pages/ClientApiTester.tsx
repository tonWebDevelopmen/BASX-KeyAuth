import React, { useState } from 'react';
import { Terminal, Send, Check, Copy, Play, ArrowRight, ShieldCheck, Database, KeyRound, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';

export const ClientApiTester: React.FC = () => {
  const { currentApp } = useApp();
  const { owner } = useAuth();

  const [activeTab, setActiveTab] = useState<'init' | 'login' | 'register' | 'license' | 'getvar'>('init');
  const [testSessionId, setTestSessionId] = useState('');
  const [testUsername, setTestUsername] = useState('demoUser');
  const [testPassword, setTestPassword] = useState('pass1234');
  const [testKey, setTestKey] = useState('');
  const [testHwid, setTestHwid] = useState('HWID-HASH-PC-9821');
  const [testVarKey, setTestVarKey] = useState('MOTD');

  const [executing, setExecuting] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);

  const runTestCall = async () => {
    setExecuting(true);
    setLastResponse(null);

    let payload: any = {};
    if (activeTab === 'init') {
      payload = {
        type: 'init',
        name: currentApp?.name || 'BASXApp1',
        ownerid: owner?.id || 'OwnerId',
        ver: currentApp?.version || '1.0',
      };
    } else if (activeTab === 'login') {
      payload = {
        type: 'login',
        username: testUsername,
        pass: testPassword,
        hwid: testHwid,
        sessionid: testSessionId,
      };
    } else if (activeTab === 'register') {
      payload = {
        type: 'register',
        username: testUsername,
        pass: testPassword,
        key: testKey,
        hwid: testHwid,
        sessionid: testSessionId,
      };
    } else if (activeTab === 'license') {
      payload = {
        type: 'license',
        key: testKey,
        hwid: testHwid,
        sessionid: testSessionId,
      };
    } else if (activeTab === 'getvar') {
      payload = {
        type: 'getvar',
        varid: testVarKey,
        sessionid: testSessionId,
      };
    }

    try {
      const res = await fetch('/api/v1/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setResponseStatus(res.status);
      const data = await res.json();
      setLastResponse(data);

      if (data?.sessionid) {
        setTestSessionId(data.sessionid);
      }
    } catch (err: any) {
      setLastResponse({ error: err.message || 'Request failed' });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Client API Sandbox" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
          <Terminal className="w-5 h-5 text-orange-400" />
          <span>Interactive Client API Sandbox</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Simulate desktop application calls (C++, C#, Python) in real-time. Test the handshake, register, login, license validation, and variable retrieval.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Request Builder (6 cols) */}
        <div className="lg:col-span-6 bg-[#16171c] border border-[#22242b] rounded-xl p-5 shadow-xl space-y-4">
          {/* Method tabs */}
          <div className="flex flex-wrap gap-1 border-b border-[#22242f] pb-3">
            {[
              { id: 'init', label: '1. Handshake (init)' },
              { id: 'register', label: '2. Register (key)' },
              { id: 'login', label: '3. User Login' },
              { id: 'license', label: 'Key-Only Auth' },
              { id: 'getvar', label: 'Get Variable' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-[#20222b]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="text-xs text-zinc-400 font-mono bg-[#111216] p-2.5 rounded-lg border border-[#22242f]">
              <span className="text-emerald-400 font-bold">POST</span> /api/v1/client
            </div>

            {/* Session ID requirement notice */}
            {activeTab !== 'init' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-300 font-semibold">
                  <span>Session ID (Handshake Token):</span>
                  {!testSessionId && (
                    <span className="text-[10px] text-amber-400">Run 'init' first to acquire token!</span>
                  )}
                </div>
                <input
                  type="text"
                  value={testSessionId}
                  onChange={e => setTestSessionId(e.target.value)}
                  placeholder="Execute 'init' step above to auto-fill session token..."
                  className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {/* Parameters for Init */}
            {activeTab === 'init' && (
              <div className="space-y-2 text-xs text-zinc-400">
                <p>Initializes client handshake for application <span className="text-white font-bold">{currentApp?.name}</span>.</p>
                <div className="bg-[#111216] p-3 rounded-lg border border-[#22242f] space-y-1 font-mono text-[11px]">
                  <div>"name": "{currentApp?.name}"</div>
                  <div>"ownerid": "{owner?.id}"</div>
                  <div>"ver": "{currentApp?.version || '1.0'}"</div>
                </div>
              </div>
            )}

            {/* Parameters for Register */}
            {activeTab === 'register' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Username</label>
                  <input
                    type="text"
                    value={testUsername}
                    onChange={e => setTestUsername(e.target.value)}
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Password</label>
                  <input
                    type="text"
                    value={testPassword}
                    onChange={e => setTestPassword(e.target.value)}
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">License Key</label>
                  <input
                    type="text"
                    value={testKey}
                    onChange={e => setTestKey(e.target.value)}
                    placeholder="BASX-XXXX-XXXX-XXXX"
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Hardware ID (HWID)</label>
                  <input
                    type="text"
                    value={testHwid}
                    onChange={e => setTestHwid(e.target.value)}
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Parameters for Login */}
            {activeTab === 'login' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Username</label>
                  <input
                    type="text"
                    value={testUsername}
                    onChange={e => setTestUsername(e.target.value)}
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Password</label>
                  <input
                    type="text"
                    value={testPassword}
                    onChange={e => setTestPassword(e.target.value)}
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Hardware ID (HWID)</label>
                  <input
                    type="text"
                    value={testHwid}
                    onChange={e => setTestHwid(e.target.value)}
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Parameters for License Auth */}
            {activeTab === 'license' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">License Key</label>
                  <input
                    type="text"
                    value={testKey}
                    onChange={e => setTestKey(e.target.value)}
                    placeholder="BASX-XXXX-XXXX-XXXX"
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Hardware ID (HWID)</label>
                  <input
                    type="text"
                    value={testHwid}
                    onChange={e => setTestHwid(e.target.value)}
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Parameters for Getvar */}
            {activeTab === 'getvar' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Variable Name</label>
                  <input
                    type="text"
                    value={testVarKey}
                    onChange={e => setTestVarKey(e.target.value)}
                    placeholder="MOTD"
                    className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Send Request Button */}
            <button
              onClick={runTestCall}
              disabled={executing}
              className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-600/30 transition-all active:scale-[0.99]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{executing ? 'Executing Request...' : `Send "${activeTab}" Request`}</span>
            </button>
          </div>
        </div>

        {/* Right: Server Response Viewer (6 cols) */}
        <div className="lg:col-span-6 bg-[#16171c] border border-[#22242b] rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#22242f] pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-400" />
              <span>Server Response Preview</span>
            </h2>
            {responseStatus && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                responseStatus >= 200 && responseStatus < 300
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                HTTP {responseStatus}
              </span>
            )}
          </div>

          <div className="bg-[#0f1013] border border-[#232532] rounded-xl p-4 min-h-[360px] font-mono text-xs overflow-auto">
            {executing ? (
              <div className="flex items-center justify-center h-72 text-zinc-500">
                Contacting BasxAuth Service PRO engine...
              </div>
            ) : lastResponse ? (
              <pre className="text-zinc-200 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 text-zinc-600 space-y-2">
                <Terminal className="w-8 h-8 opacity-40" />
                <p>Click "Send Request" to preview live response payload</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
