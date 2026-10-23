import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopHeader } from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';
import { LifeBuoy } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { owner, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1013] flex items-center justify-center text-zinc-400 text-xs font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span>Initializing BasxAuth Service PRO...</span>
        </div>
      </div>
    );
  }

  if (!owner) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0f1013] flex flex-row font-sans text-zinc-200">
      {/* Sidebar on left */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Fixed Vertical "SUPPORT" Tab on extreme right */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <button
          onClick={() => alert("BasxAuth Service PRO Support Desk\n\n• Server: BasxAuth Service PRO\n• Client API: http://localhost:3000/api/v1/client\n• Seller API: http://localhost:3000/api/v1/seller\n• All features unlocked with unlimited users and keys.")}
          className="bg-[#1f212a] hover:bg-orange-600 text-zinc-400 hover:text-white border-l border-t border-b border-[#2d303e] rounded-l-md px-1.5 py-4 text-[11px] font-bold tracking-widest uppercase transition-colors shadow-2xl flex flex-col items-center gap-1 cursor-pointer"
          style={{ writingMode: 'vertical-rl' }}
          title="Open Support Help Desk"
        >
          <span>S U P P O R T</span>
        </button>
      </div>
    </div>
  );
};
