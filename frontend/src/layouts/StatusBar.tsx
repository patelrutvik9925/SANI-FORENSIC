import React from 'react';
import { Activity, Cpu, HardDrive, Database, Server } from 'lucide-react';
import type { SystemStatus } from '../types';

interface StatusBarProps {
  status: SystemStatus | null;
  isConnected: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, isConnected }) => {
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <footer className="h-8 bg-cyber-card border-t border-cyber-border px-4 flex items-center justify-between text-[11px] font-mono text-cyber-muted select-none z-10">
      <div className="flex items-center gap-4 overflow-hidden">
        {/* Backend API status */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-cyber-emerald shadow-[0_0_8px_#10b981]' : 'bg-cyber-rose animate-pulse'
            }`}
          />
          <span className="text-cyber-text font-medium">
            {isConnected ? 'API CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {/* OS & Architecture */}
        {status && (
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 border-l border-cyber-border pl-4">
            <Server className="w-3 h-3 text-cyber-muted" />
            <span>{status.os_name} ({status.architecture})</span>
          </div>
        )}

        {/* CPU Telemetry */}
        {status && (
          <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0 border-l border-cyber-border pl-4">
            <Cpu className="w-3 h-3 text-cyber-muted" />
            <span>CPU: {status.cpu_percent.toFixed(0)}% ({status.cpu_count} Cores)</span>
          </div>
        )}

        {/* Memory Telemetry */}
        {status && (
          <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0 border-l border-cyber-border pl-4">
            <Activity className="w-3 h-3 text-cyber-muted" />
            <span>RAM: {status.memory_percent.toFixed(0)}% ({formatBytes(status.memory_used)} / {formatBytes(status.memory_total)})</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Workspace Storage */}
        {status && (
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3 h-3 text-cyber-accent" />
            <span>FREE: {formatBytes(status.workspace_disk.free)}</span>
          </div>
        )}

        {/* Active operations counter */}
        {status && (
          <div className="hidden sm:flex items-center gap-1.5 border-l border-cyber-border pl-4">
            <Database className="w-3 h-3 text-cyber-blue" />
            <span>ACTIVE JOBS: {status.active_operations_count}</span>
          </div>
        )}
      </div>
    </footer>
  );
};
