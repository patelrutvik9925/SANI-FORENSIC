import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { systemApi } from '../services/api';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Poll real system status every 5 seconds
  const { data: systemStatus, isError } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: systemApi.getStatus,
    refetchInterval: 5000,
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-cyber-bg text-cyber-text">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <Header
          onToggleSidebar={() => setCollapsed(!collapsed)}
          systemStatus={systemStatus || null}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-cyber-bg">
          <Outlet />
        </main>

        {/* Status Bar */}
        <StatusBar
          status={systemStatus || null}
          isConnected={!isError}
        />
      </div>
    </div>
  );
};
