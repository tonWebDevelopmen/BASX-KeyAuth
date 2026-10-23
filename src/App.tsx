import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './layouts/AppLayout';
import { Login } from './pages/Login';
import { ManageApps } from './pages/ManageApps';
import { Licenses } from './pages/Licenses';
import { Users } from './pages/Users';
import { Subscriptions } from './pages/Subscriptions';
import { Variables } from './pages/Variables';
import { Blacklist } from './pages/Blacklist';
import { Webhooks } from './pages/Webhooks';
import { TokensAndSessions } from './pages/TokensAndSessions';
import { Chats } from './pages/Chats';
import { Files } from './pages/Files';
import { EventLogs } from './pages/EventLogs';
import { AppSettings } from './pages/AppSettings';
import { ClientApiTester } from './pages/ClientApiTester';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

            <Route path="/app" element={<AppLayout />}>
              <Route index element={<ManageApps />} />
              <Route path="licenses" element={<Licenses />} />
              <Route path="users" element={<Users />} />
              <Route path="tokens" element={<TokensAndSessions />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="chats" element={<Chats />} />
              <Route path="sessions" element={<TokensAndSessions />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="files" element={<Files />} />
              <Route path="variables" element={<Variables />} />
              <Route path="rules" element={<Blacklist />} />
              <Route path="logs" element={<EventLogs />} />
              <Route path="settings" element={<AppSettings />} />
              <Route path="tester" element={<ClientApiTester />} />
            </Route>

            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
