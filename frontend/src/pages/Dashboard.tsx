import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HardDrive,
  Activity,
  CheckCircle,
  History,
  Layers,
  Database,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { systemApi, auditApi } from '../services/api';
import { PermissionBanner } from '../components/common/PermissionBanner';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';

export const Dashboard: React.FC = () => {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: systemApi.getStatus,
    refetchInterval: 5000,
  });

  const { data: recentAudits } = useQuery({
    queryKey: ['recentAudits'],
    queryFn: () => auditApi.getLogs({ limit: 6 }),
    refetchInterval: 8000,
  });

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (statusLoading && !status) {
    return <LoadingState message="Connecting to SANI-FORENSIC engine..." />;
  }

  // Calculate total storage across all mounted partitions
  const totalStorage = status?.partitions.reduce((acc, p) => acc + p.total, 0) || 0;
  const usedStorage = status?.partitions.reduce((acc, p) => acc + p.used, 0) || 0;
  const freeStorage = status?.partitions.reduce((acc, p) => acc + p.free, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / System Elevation Status */}
      {status && (
        <PermissionBanner
          isAdmin={status.is_admin}
          privilegeLevel={status.privilege_level}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-cyber-text tracking-wide uppercase flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyber-accent" />
            Forensic Command Center
          </h1>
          <p className="text-xs font-mono text-cyber-muted mt-0.5">
            Real-time OS telemetry, storage volumes, and active operations monitor.
          </p>
        </div>

        <button
          onClick={() => refetchStatus()}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border rounded text-xs font-mono text-cyber-muted hover:text-cyber-text transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mounted Volumes */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg">
          <div className="flex items-center justify-between text-cyber-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Mounted Volumes</span>
            <Layers className="w-4 h-4 text-cyber-accent" />
          </div>
          <div className="text-2xl font-mono font-bold text-cyber-text">
            {status?.partitions.length || 0}
          </div>
          <p className="text-[11px] font-mono text-cyber-muted mt-1">
            Total capacity: {formatBytes(totalStorage)}
          </p>
        </div>

        {/* Available Storage */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg">
          <div className="flex items-center justify-between text-cyber-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Available Storage</span>
            <HardDrive className="w-4 h-4 text-cyber-emerald" />
          </div>
          <div className="text-2xl font-mono font-bold text-cyber-emerald">
            {formatBytes(freeStorage)}
          </div>
          <p className="text-[11px] font-mono text-cyber-muted mt-1">
            Used: {formatBytes(usedStorage)} ({(totalStorage > 0 ? (usedStorage / totalStorage * 100) : 0).toFixed(0)}%)
          </p>
        </div>

        {/* Active Background Operations */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg">
          <div className="flex items-center justify-between text-cyber-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Active Operations</span>
            <Activity className="w-4 h-4 text-cyber-blue" />
          </div>
          <div className="text-2xl font-mono font-bold text-cyber-text">
            {status?.active_operations_count || 0}
          </div>
          <p className="text-[11px] font-mono text-cyber-muted mt-1">
            Running / queued tasks
          </p>
        </div>

        {/* Completed vs Failed Jobs */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg">
          <div className="flex items-center justify-between text-cyber-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Jobs Completed / Failed</span>
            <CheckCircle className="w-4 h-4 text-cyber-purple" />
          </div>
          <div className="text-2xl font-mono font-bold text-cyber-text flex items-baseline gap-2">
            <span className="text-cyber-emerald">{status?.completed_operations_count || 0}</span>
            <span className="text-cyber-muted text-base">/</span>
            <span className="text-cyber-rose">{status?.failed_operations_count || 0}</span>
          </div>
          <p className="text-[11px] font-mono text-cyber-muted mt-1">
            Historical task totals
          </p>
        </div>
      </div>

      {/* Active Operations & Storage Telemetry Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mounted Storage Volumes (Real detected drives/partitions) */}
        <div className="lg:col-span-2 bg-cyber-card border border-cyber-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyber-accent" />
              <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-cyber-text">
                Detected Storage Volumes
              </h2>
            </div>
            <span className="text-xs font-mono text-cyber-muted">
              {status?.partitions.length || 0} Active Mounts
            </span>
          </div>

          {status?.partitions && status.partitions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-cyber-border text-cyber-muted text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-medium">Mount Point</th>
                    <th className="pb-3 font-medium">Filesystem</th>
                    <th className="pb-3 font-medium">Total Size</th>
                    <th className="pb-3 font-medium">Used Space</th>
                    <th className="pb-3 font-medium">Free Space</th>
                    <th className="pb-3 font-medium">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyber-border/40">
                  {status.partitions.map((p) => (
                    <tr key={p.mountpoint} className="hover:bg-cyber-cardHover/50 transition-colors">
                      <td className="py-3 font-semibold text-cyber-text flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyber-accent" />
                        {p.mountpoint || p.device}
                      </td>
                      <td className="py-3 text-cyber-muted">{p.fstype || 'UNKNOWN'}</td>
                      <td className="py-3 text-cyber-text">{formatBytes(p.total)}</td>
                      <td className="py-3 text-cyber-muted">{formatBytes(p.used)}</td>
                      <td className="py-3 text-cyber-emerald">{formatBytes(p.free)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-cyber-bg border border-cyber-border rounded overflow-hidden">
                            <div
                              className={`h-full ${
                                p.percent > 90 ? 'bg-cyber-rose' : p.percent > 75 ? 'bg-cyber-amber' : 'bg-cyber-accent'
                              }`}
                              style={{ width: `${Math.min(100, p.percent)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-cyber-muted">{p.percent.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={HardDrive}
              title="No Storage Volumes Detected"
              description="No accessible storage volumes or physical disks were reported by the operating system."
            />
          )}
        </div>

        {/* Active Operations Panel (STRICT NO FAKE DATA RULE) */}
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyber-accent" />
                <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-cyber-text">
                  Live Operations
                </h2>
              </div>
            </div>

            {status?.active_operations_count === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-cyber-bg border border-cyber-border rounded-full text-cyber-muted mb-3">
                  <Database className="w-6 h-6 opacity-60" />
                </div>
                <span className="text-xs font-mono font-semibold tracking-wider text-cyber-muted uppercase">
                  NO ACTIVE OPERATIONS
                </span>
                <p className="text-[11px] font-mono text-cyber-darkMuted mt-1 max-w-xs">
                  All recovery scans, file carvings, and sanitization tasks are currently idle.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-cyber-bg border border-cyber-border rounded text-xs font-mono">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-cyber-text font-medium">Running Operation</span>
                    <StatusBadge status="RUNNING" size="sm" />
                  </div>
                  <p className="text-cyber-muted text-[11px]">Executing backend task worker...</p>
                </div>
              </div>
            )}
          </div>

          {/* Forensic Workspace Partition Status */}
          {status?.workspace_disk && (
            <div className="pt-4 border-t border-cyber-border mt-4">
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-cyber-muted">WORKSPACE REPOSITORY:</span>
                <span className="text-cyber-text">{formatBytes(status.workspace_disk.free)} Free</span>
              </div>
              <div className="w-full h-1.5 bg-cyber-bg border border-cyber-border rounded overflow-hidden">
                <div
                  className="h-full bg-cyber-accent"
                  style={{ width: `${Math.min(100, status.workspace_disk.percent)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-cyber-darkMuted block mt-1 truncate">
                {status.workspace_disk.path}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Audit Trail Records */}
      <div className="bg-cyber-card border border-cyber-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyber-accent" />
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-cyber-text">
              Recent Cryptographic Audit Records
            </h2>
          </div>
          <span className="text-xs font-mono text-cyber-muted">
            Tamper-evident SHA-256 logs
          </span>
        </div>

        {recentAudits && recentAudits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-cyber-border text-cyber-muted text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-medium">Timestamp (UTC)</th>
                  <th className="pb-3 font-medium">Operator</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Target</th>
                  <th className="pb-3 font-medium">Result</th>
                  <th className="pb-3 font-medium">Cryptographic Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {recentAudits.map((log) => (
                  <tr key={log.id} className="hover:bg-cyber-cardHover/50 transition-colors">
                    <td className="py-2.5 text-cyber-muted">
                      {log.timestamp ? log.timestamp.replace('T', ' ').substring(0, 19) : ''}
                    </td>
                    <td className="py-2.5 text-cyber-text font-medium">{log.username || 'SYSTEM'}</td>
                    <td className="py-2.5 text-cyber-accent">{log.action}</td>
                    <td className="py-2.5 text-cyber-muted">{log.target_identifier || '—'}</td>
                    <td className="py-2.5">
                      <StatusBadge status={log.result} size="sm" />
                    </td>
                    <td className="py-2.5 text-cyber-darkMuted text-[10px] truncate max-w-xs" title={log.record_hash}>
                      {log.record_hash ? log.record_hash.substring(0, 16) + '...' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={History}
            title="No Audit Records"
            description="The audit log ledger is currently empty. Actions taken by operators will be cryptographically chained here."
          />
        )}
      </div>
    </div>
  );
};
