import React from 'react';
import { Home, ChevronRight, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

interface BreadcrumbProps {
  pageTitle: string;
}

export const BreadcrumbBar: React.FC<BreadcrumbProps> = ({ pageTitle }) => {
  const { currentApp } = useApp();

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mb-6">
      <Link to="/app" className="flex items-center gap-1.5 hover:text-orange-400 transition-colors">
        <Home className="w-3.5 h-3.5" />
        <span>Manage Apps</span>
      </Link>

      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />

      <span className="text-zinc-300 font-medium truncate">
        Current Application: <span className="text-white font-semibold">{currentApp?.name || 'None'}</span>
      </span>

      {pageTitle !== 'Manage Applications' && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <span className="text-orange-400 font-medium">{pageTitle}</span>
        </>
      )}

      <div className="hidden md:flex items-center gap-1.5 ml-auto text-[11px] text-orange-400/90 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
        <Zap className="w-3 h-3 text-orange-400" />
        <span>BasxAuth Service PRO &bull; Unlimited Equal Access</span>
      </div>
    </div>
  );
};
