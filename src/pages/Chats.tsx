import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Crown, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

interface ChatMessage {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

export const Chats: React.FC = () => {
  const { currentApp } = useApp();
  const { owner } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!currentApp) return;
    try {
      const res = await api.get<ChatMessage[]>(`/api/apps/${currentApp.id}/chats`);
      if (Array.isArray(res.data)) setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentApp]);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp || !inputMsg.trim()) return;
    await api.post(`/api/apps/${currentApp.id}/chats`, {
      message: inputMsg.trim(),
      author: owner?.username || 'Admin',
    });
    setInputMsg('');
    await fetchChats();
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Chats" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <span>In-App Chat Channel</span>
            <Crown className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Built-in encrypted chatroom for connected users in this application.
          </p>
        </div>
      </div>

      <div className="bg-[#16171c] border border-[#22242b] rounded-xl flex flex-col h-[520px] shadow-xl overflow-hidden">
        {/* Messages feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center text-zinc-500 text-xs py-12">Loading chat stream...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-zinc-500 text-xs py-16 space-y-1">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p>No chat messages yet in #{currentApp?.name || 'app'}.</p>
              <p className="text-zinc-600">Post an announcement below to start conversation.</p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0 mt-0.5">
                  {m.author.charAt(0).toUpperCase()}
                </div>
                <div className="bg-[#111216] border border-[#232530] rounded-xl px-3.5 py-2 max-w-xl text-xs space-y-0.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-[11px]">{m.author}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{formatDate(m.createdAt)}</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed break-words">{m.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSend} className="p-3 bg-[#121316] border-t border-[#22242b] flex items-center gap-2">
          <input
            type="text"
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            placeholder={`Message #${currentApp?.name || 'app'} as ${owner?.username || 'Admin'}...`}
            className="flex-1 bg-[#18191e] border border-[#2a2c38] rounded-xl px-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
