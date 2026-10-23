import React, { useState } from 'react';
import { Search, ChevronDown, User, Key, LogOut, Copy, Check, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const TopHeader: React.FC = () => {
  const { owner, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleCopySellerKey = () => {
    if (owner?.sellerKey) {
      navigator.clipboard.writeText(owner.sellerKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.toLowerCase().trim();
    if (q.includes('key') || q.includes('license')) navigate('/app/licenses');
    else if (q.includes('user')) navigate('/app/users');
    else if (q.includes('setting')) navigate('/app/settings');
    else if (q.includes('webhook')) navigate('/app/webhooks');
    else if (q.includes('var')) navigate('/app/variables');
    else if (q.includes('sub') || q.includes('tier')) navigate('/app/subscriptions');
    else if (q.includes('test') || q.includes('api')) navigate('/app/tester');
    else navigate('/app');
  };

  return (
    <header className="h-16 px-6 bg-[#121316]/90 backdrop-blur-md border-b border-[#1e2027]/70 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search pages, keys, users..."
          className="w-full bg-[#18191e] border border-[#272933] rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/30 transition-all font-sans"
        />
      </form>

      {/* User profile card & Support button */}
      <div className="flex items-center gap-3">
        {/* Download Project ZIP button */}
        <a
          href="/BASX-KeyAuth-Full.zip"
          download="BASX-KeyAuth-Full.zip"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
          title="Download complete project as .ZIP (UI, Animations, Server, KeyAuth API)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download .ZIP</span>
        </a>

        {/* Support quick link */}
        <a
          href="#support"
          onClick={(e) => { e.preventDefault(); alert("BasxAuth Service PRO Support Desk is available 24/7. All system features are 100% unlocked with zero limits and equal access."); }}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-orange-400 bg-[#18191e] border border-[#272933] hover:border-orange-500/40 transition-all"
        >
          <span>Support Desk</span>
        </a>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 p-1.5 pr-2.5 rounded-xl hover:bg-[#18191e] border border-transparent hover:border-[#272933] transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 p-0.5 flex items-center justify-center shadow-md shadow-orange-500/10">
              <div className="w-full h-full rounded-full bg-[#16171c] flex items-center justify-center">
                <User className="w-4 h-4 text-orange-400" />
              </div>
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                {owner ? owner.username : 'BASX'}
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${menuOpen ? 'rotate-180 text-orange-400' : ''}`} />
              </div>
              <div className="text-[10px] text-orange-400 font-medium tracking-tight">
                BasxAuth Service PRO
              </div>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-14 w-64 bg-[#18191e] border border-[#2b2d39] rounded-xl shadow-2xl p-2 z-50 text-xs">
              <div className="p-2 border-b border-[#262835] mb-1">
                <div className="font-semibold text-zinc-100">{owner?.username}</div>
                <div className="text-zinc-400 text-[11px] truncate">{owner?.email}</div>
              </div>

              {/* Seller key copy box */}
              <div className="p-2 bg-[#121316] rounded-lg border border-[#262835] my-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-zinc-400 mb-1">
                  <span>Seller API Key</span>
                  <button
                    onClick={handleCopySellerKey}
                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-[10px] text-zinc-300 truncate select-all">
                  {owner?.sellerKey || 'N/A'}
                </div>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/app/settings'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-[#23252f] transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  Account Settings
                </button>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
