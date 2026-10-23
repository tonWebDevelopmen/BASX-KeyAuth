import React, { useState, useEffect, useCallback } from 'react';
import { Webhook as WebhookIcon, Plus, Trash2, Send, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import api from '../lib/api';

interface Webhook {
  id: string;
  url: string;
  name?: string;
  events: string[];
}

const AVAILABLE_EVENTS = [
  { id: 'user_registered', label: 'User Registered' },
  { id: 'key_redeemed', label: 'Key Redeemed' },
  { id: 'login_success', label: 'Login Succeeded' },
  { id: 'login_failed', label: 'Login Failed' },
  { id: 'user_banned', label: 'User Banned' },
];

export const Webhooks: React.FC = () => {
  const { currentApp } = useApp();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'user_registered',
    'key_redeemed',
    'login_success',
    'login_failed',
    'user_banned',
  ]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    if (!currentApp) return;
    setLoading(true);
    try {
      const res = await api.get<Webhook[]>(`/api/apps/${currentApp.id}/webhooks`);
      if (Array.isArray(res.data)) setWebhooks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentApp]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleToggleEvent = (ev: string) => {
    setSelectedEvents(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp || !url.trim()) return;
    await api.post(`/api/apps/${currentApp.id}/webhooks`, {
      name: name.trim() || 'Discord Webhook',
      url: url.trim(),
      events: selectedEvents,
    });
    setName('');
    setUrl('');
    await fetchWebhooks();
  };

  const handleDelete = async (id: string) => {
    if (!currentApp) return;
    await api.delete(`/api/apps/${currentApp.id}/webhooks/${id}`);
    await fetchWebhooks();
  };

  const handleTestPing = async (id: string) => {
    if (!currentApp) return;
    setTestingId(id);
    try {
      const res = await api.post(`/api/apps/${currentApp.id}/webhooks/${id}/test`);
      alert(res.data?.message || 'Test message dispatched to Discord/Telegram');
    } catch {
      alert('Failed to send test webhook');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Webhooks" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Discord & Event Webhooks
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Receive real-time notifications in your Discord or Telegram server when licenses are used, users register, logins fail, or accounts are banned.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-400" />
            Add Webhook Integration
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Webhook Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. #license-logs Discord"
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Webhook URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Trigger On Events:
              </label>
              <div className="space-y-1.5">
                {AVAILABLE_EVENTS.map(ev => (
                  <label key={ev.id} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(ev.id)}
                      onChange={() => handleToggleEvent(ev.id)}
                      className="rounded border-[#353744] bg-[#18191e] text-orange-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>{ev.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all mt-2"
            >
              Save Webhook
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-500 text-xs py-8 text-center">Loading webhooks...</div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#22242b] rounded-xl text-zinc-400 text-xs">
              No webhooks configured yet. Add a Discord webhook URL to get real-time activity pings.
            </div>
          ) : (
            webhooks.map(w => (
              <div
                key={w.id}
                className="bg-[#16171c] border border-[#22242b] rounded-xl p-4 flex items-start justify-between hover:border-[#2f313c] transition-all gap-4"
              >
                <div className="flex items-start gap-3 flex-1 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                    <WebhookIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs font-bold text-white truncate">
                      {w.name || 'Webhook'}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-500 truncate mt-0.5">
                      {w.url}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.events.map(ev => (
                        <span key={ev} className="text-[10px] px-2 py-0.5 rounded bg-[#111216] border border-[#272935] text-zinc-400 font-mono">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTestPing(w.id)}
                    disabled={testingId === w.id}
                    className="px-2.5 py-1.5 rounded-lg bg-[#22242e] hover:bg-orange-600 hover:text-white text-zinc-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>{testingId === w.id ? 'Sending...' : 'Test'}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
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
