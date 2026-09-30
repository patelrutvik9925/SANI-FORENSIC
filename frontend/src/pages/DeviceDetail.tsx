import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HardDrive,
  ArrowLeft,
  RotateCcw,
  Trash2,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Server,
  Layers
} from 'lucide-react';
import { deviceApi } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { DangerDialog } from '../components/common/DangerDialog';

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deviceId = parseInt(id || '0', 10);

  const [isDangerOpen, setIsDangerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const { data: device, isLoading, refetch } = useQuery({
    queryKey: ['deviceDetail', deviceId],
    queryFn: () => deviceApi.getDevice(deviceId),
    enabled: !!deviceId,
  });

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleScanDevice = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      await deviceApi.scanDevice(deviceId);
      await refetch();
      setScanMessage('Device partition and geometry rediscovery completed successfully.');
    } catch (err: any) {
      setScanMessage('Failed to scan device partitions.');
    } finally {
      setIsScanning(false);
    }
  };

  if (isLoading || !device) {
    return <LoadingState message="Querying physical drive geometry and partition structures..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/devices')}
          className="p-1.5 bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border rounded text-cyber-muted hover:text-cyber-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] font-mono text-cyber-muted uppercase tracking-wider block">
            STORAGE INVENTORY / {device.device_id}
          </span>
          <h1 className="text-xl font-mono font-bold text-cyber-text tracking-wide uppercase flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyber-accent" />
            {device.name}
          </h1>
        </div>
      </div>

      {/* Safety Alert if System Drive or Protected */}
      {!device.sanitization_allowed && (
        <div className="p-4 bg-cyber-amber/10 border border-cyber-amber/40 rounded-lg flex items-start gap-3 text-xs font-mono text-cyber-amber">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold tracking-wider uppercase block">
              SANITIZATION SAFETY BARRIER ACTIVE
            </span>
            <p className="opacity-90">{device.sanitization_block_reason}</p>
          </div>
        </div>
      )}

      {/* Hardware Identity & Storage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hardware Identity */}
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-cyber-border pb-3">
            <Server className="w-4 h-4 text-cyber-accent" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyber-text">
              Physical Hardware Identity
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-cyber-bg border border-cyber-border rounded">
              <span className="text-cyber-muted uppercase text-[10px] block mb-0.5">Device Identifier</span>
              <span className="font-bold text-cyber-text">{device.device_id}</span>
            </div>
            <div className="p-2.5 bg-cyber-bg border border-cyber-border rounded">
              <span className="text-cyber-muted uppercase text-[10px] block mb-0.5">Serial Number</span>
              <span className="font-medium text-cyber-text select-all">{device.serial || 'N/A'}</span>
            </div>
            <div className="p-2.5 bg-cyber-bg border border-cyber-border rounded">
              <span className="text-cyber-muted uppercase text-[10px] block mb-0.5">Media Type</span>
              <StatusBadge status={device.media_type || 'DISK'} size="sm" />
            </div>
            <div className="p-2.5 bg-cyber-bg border border-cyber-border rounded">
              <span className="text-cyber-muted uppercase text-[10px] block mb-0.5">Bus Interface</span>
              <span className="font-medium text-cyber-accent uppercase">{device.bus_type || 'Internal'}</span>
            </div>
            <div className="p-2.5 bg-cyber-bg border border-cyber-border rounded">
              <span className="text-cyber-muted uppercase text-[10px] block mb-0.5">Operational Status</span>
              <StatusBadge status={device.operational_status || 'OK'} size="sm" />
            </div>
            <div className="p-2.5 bg-cyber-bg border border-cyber-border rounded">
              <span className="text-cyber-muted uppercase text-[10px] block mb-0.5">Removable Media</span>
              <span className="font-medium text-cyber-text">{device.is_removable ? 'YES' : 'NO (Fixed)'}</span>
            </div>
          </div>
        </div>

        {/* Storage Capacity & Operations */}
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 border-b border-cyber-border pb-3 mb-3">
              <HardDrive className="w-4 h-4 text-cyber-accent" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyber-text">
                Capacity & Allocation
              </h2>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-cyber-muted">Total Gross Capacity:</span>
                <span className="font-bold text-cyber-text">{formatBytes(device.capacity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted">Allocated Volume Space:</span>
                <span className="font-medium text-cyber-text">{formatBytes(device.used_space)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted">Available Space:</span>
                <span className="font-medium text-cyber-emerald">{formatBytes(device.free_space)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted">Filesystem(s):</span>
                <span className="font-medium text-cyber-accent">{device.filesystem || 'Raw / Unformatted'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted">Mount Point(s):</span>
                <span className="font-semibold text-cyber-text">{device.mount_point || 'Unmounted'}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="pt-4 border-t border-cyber-border grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              onClick={handleScanDevice}
              disabled={isScanning}
              className="px-3 py-2 bg-cyber-bg hover:bg-cyber-cardHover border border-cyber-border rounded font-semibold text-cyber-text flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>SCAN PARTITIONS</span>
            </button>

            <button
              onClick={() => navigate('/recovery')}
              className="px-3 py-2 bg-cyber-bg hover:bg-cyber-cardHover border border-cyber-border hover:border-cyber-accent rounded font-semibold text-cyber-accent flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RECOVER FILES</span>
            </button>

            <button
              onClick={() => setIsDangerOpen(true)}
              disabled={!device.sanitization_allowed}
              className="px-3 py-2 bg-cyber-rose/10 hover:bg-cyber-rose/20 disabled:opacity-30 border border-cyber-rose/40 text-cyber-rose rounded font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>SANITIZE DRIVE</span>
            </button>

            <button
              onClick={() => navigate('/verify')}
              className="px-3 py-2 bg-cyber-bg hover:bg-cyber-cardHover border border-cyber-border rounded font-semibold text-cyber-text flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-cyber-emerald" />
              <span>VERIFY ERASURE</span>
            </button>
          </div>
        </div>
      </div>

      {scanMessage && (
        <div className="p-3 bg-cyber-card border border-cyber-accent/40 rounded text-xs font-mono text-cyber-accent">
          {scanMessage}
        </div>
      )}

      {/* Partition Information Table */}
      <div className="bg-cyber-card border border-cyber-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyber-accent" />
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-cyber-text">
              Partition Table Layout ({device.partitions.length} Partitions Discovered)
            </h2>
          </div>
          <span className="text-xs font-mono text-cyber-muted">
            Read-only geometry snapshot
          </span>
        </div>

        {device.partitions && device.partitions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-cyber-border text-cyber-muted text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">Drive Letter</th>
                  <th className="pb-3 font-medium">Volume Label</th>
                  <th className="pb-3 font-medium">Filesystem</th>
                  <th className="pb-3 font-medium">Partition Type</th>
                  <th className="pb-3 font-medium">Capacity</th>
                  <th className="pb-3 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {device.partitions.map((p) => (
                  <tr key={p.partition_number} className="hover:bg-cyber-cardHover/50 transition-colors">
                    <td className="py-2.5 font-bold text-cyber-text">Part {p.partition_number}</td>
                    <td className="py-2.5 font-semibold text-cyber-accent">
                      {p.drive_letter || '—'}
                    </td>
                    <td className="py-2.5 text-cyber-text">{p.volume_label || 'Unlabeled'}</td>
                    <td className="py-2.5 text-cyber-muted">{p.filesystem || '—'}</td>
                    <td className="py-2.5 text-cyber-muted">{p.type || 'Standard'}</td>
                    <td className="py-2.5 text-cyber-text">{formatBytes(p.size)}</td>
                    <td className="py-2.5 flex items-center gap-1.5">
                      {p.is_system && (
                        <span className="px-1.5 py-0.5 rounded bg-cyber-amber/15 border border-cyber-amber/40 text-cyber-amber text-[10px] font-bold">
                          SYSTEM
                        </span>
                      )}
                      {p.is_boot && (
                        <span className="px-1.5 py-0.5 rounded bg-cyber-blue/15 border border-cyber-blue/40 text-cyber-blue text-[10px] font-bold">
                          BOOT
                        </span>
                      )}
                      {!p.is_system && !p.is_boot && (
                        <span className="text-cyber-darkMuted text-[10px]">DATA</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs font-mono text-cyber-muted py-6 text-center">
            No partition table detected on this storage medium. Click 'SCAN PARTITIONS' to discover underlying partition tables.
          </p>
        )}
      </div>

      {/* Danger Sanitization Modal */}
      <DangerDialog
        isOpen={isDangerOpen}
        onClose={() => setIsDangerOpen(false)}
        onConfirm={(phrase) => {
          setIsDangerOpen(false);
          navigate(`/sanitizer?device=${device.id}&phrase=${encodeURIComponent(phrase)}`);
        }}
        title={`Sanitize Drive ${device.device_id}`}
        targetIdentifier={device.device_id}
        targetDescription={`${device.name} (${device.serial || 'No Serial'}) - ${formatBytes(device.capacity)}`}
        isDestructiveDisabled={!device.sanitization_allowed}
        disabledReason={device.sanitization_block_reason}
      />
    </div>
  );
};
