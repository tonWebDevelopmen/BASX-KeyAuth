import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  KeyRound,
  Users,
  Shield,
  Layers,
  MessageSquare,
  Clock,
  Webhook as WebhookIcon,
  FileUp,
  Database,
  ShieldAlert,
  ListOrdered,
  Settings,
  Terminal,
  Crown,
  ChevronDown,
  Plus,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  onCreateAppClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCreateAppClick }) => {
  const { apps, currentApp, selectApp } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { label: 'Manage Apps', path: '/app', icon: LayoutGrid },
    { label: 'Licenses', path: '/app/licenses', icon: KeyRound },
    { label: 'Users', path: '/app/users', icon: Users },
    { label: 'Tokens', path: '/app/tokens', icon: Shield },
    { label: 'Subscriptions', path: '/app/subscriptions', icon: Layers },
    { label: 'Chats', path: '/app/chats', icon: MessageSquare },
    { label: 'Sessions', path: '/app/sessions', icon: Clock },
    { label: 'Webhooks', path: '/app/webhooks', icon: WebhookIcon },
    { label: 'Files', path: '/app/files', icon: FileUp },
    { label: 'Variables', path: '/app/variables', icon: Database },
    { label: 'Rules', path: '/app/rules', icon: ShieldAlert },
    { label: 'Event Logs', path: '/app/logs', icon: ListOrdered },
  ];

  const bottomItems = [
    { label: 'Settings', path: '/app/settings', icon: Settings },
    { label: 'Resources & API', path: '/app/tester', icon: Terminal },
  ];

  return (
    <aside className="w-64 bg-[#121316] border-r border-[#1e2027] flex flex-col h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand logo */}
      <div className="h-16 px-4 flex items-center gap-2.5 border-b border-[#1e2027]/70">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
          <Lock className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-extrabold text-sm tracking-tight text-white font-sans truncate">
            Basx<span className="text-orange-500">Auth</span>
          </span>
          <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30 whitespace-nowrap">
            Service PRO
          </span>
        </div>
      </div>

      {/* Application Selector Dropdown */}
      <div className="p-3 border-b border-[#1e2027]/70 relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#18191e] border border-[#262832] text-sm font-semibold text-zinc-200 hover:border-orange-500/50 hover:bg-[#1c1e24] transition-all"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="truncate">{currentApp ? currentApp.name : 'No App Selected'}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180 text-orange-400' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute top-14 left-3 right-3 bg-[#18191e] border border-[#2c2e3a] rounded-lg shadow-2xl p-1.5 z-50">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
              Select Application
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {apps.map(app => (
                <button
                  key={app.id}
                  onClick={() => {
                    selectApp(app);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded font-medium transition-colors ${
                    currentApp?.id === app.id
                      ? 'bg-orange-500 text-white font-semibold'
                      : 'text-zinc-300 hover:bg-[#23252d] hover:text-white'
                  }`}
                >
                  <span className="truncate">{app.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">v{app.version}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-[#2a2c38] mt-1.5 pt-1.5">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  if (onCreateAppClick) onCreateAppClick();
                  else navigate('/app');
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New App
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === '/app'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 font-semibold border border-orange-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18191e]'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                <span>{item.label}</span>
              </div>
            </NavLink>
          );
        })}

        <div className="pt-3 pb-1 px-3">
          <div className="h-px bg-[#1f2129]" />
        </div>

        {bottomItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 font-semibold border border-orange-500/30'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18191e]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer / Account status indicator */}
      <div className="p-3 border-t border-[#1e2027]/70 text-[11px] text-zinc-500 flex items-center justify-between">
        <span className="font-mono text-zinc-400 font-medium">BasxAuth v1.3</span>
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Operational
        </span>
      </div>
    </aside>
  );
};
