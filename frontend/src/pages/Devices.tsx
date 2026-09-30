import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  HardDrive,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Server,
  Usb
} from 'lucide-react';
import { deviceApi } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';

export const Devices: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SSD' | 'HDD' | 'USB'>('ALL');

  const { data: devices, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['devicesList'],
    queryFn: deviceApi.listDevices,
    refetchInterval: 10000,
  });

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const filteredDevices = devices?.filter((d) => {
    if (typeFilter !== 'ALL') {
      if (typeFilter === 'USB' && !d.is_removable && d.bus_type?.toUpperCase() !== 'USB') return false;
      if (typeFilter === 'SSD' && d.media_type?.toUpperCase() !== 'SSD') return false;
      if (typeFilter === 'HDD' && d.media_type?.toUpperCase() !== 'HDD') return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.device_id.toLowerCase().includes(q) ||
      (d.model && d.model.toLowerCase().includes(q)) ||
      (d.serial && d.serial.toLowerCase().includes(q)) ||
      (d.mount_point && d.mount_point.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-cyber-text tracking-wide uppercase flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyber-accent" />
            Physical Storage Device Inventory
          </h1>
          <p className="text-xs font-mono text-cyber-muted mt-0.5">
            Real OS storage enumeration, partition structures, and forensic write-block verification.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border rounded text-xs font-mono text-cyber-muted hover:text-cyber-text transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          <span>Scan Storage Hardware</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-cyber-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search model, serial, mount point..."
            className="w-full pl-9 pr-3 py-1.5 bg-cyber-bg border border-cyber-border rounded text-xs font-mono text-cyber-text placeholder-cyber-darkMuted focus:outline-none focus:border-cyber-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'SSD', 'HDD', 'USB'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
                typeFilter === type
                  ? 'bg-cyber-accent/15 border-cyber-accent text-cyber-accent font-semibold'
                  : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-cyber-text'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Device Table */}
      <div className="bg-cyber-card border border-cyber-border rounded-lg p-5">
        {isLoading ? (
          <LoadingState message="Detecting physical storage hardware via PowerShell/WMI..." />
        ) : filteredDevices && filteredDevices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-cyber-border text-cyber-muted text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-medium">Device Identifier</th>
                  <th className="pb-3 font-medium">Hardware Model</th>
                  <th className="pb-3 font-medium">Bus Interface</th>
                  <th className="pb-3 font-medium">Media Type</th>
                  <th className="pb-3 font-medium">Capacity</th>
                  <th className="pb-3 font-medium">Mount Point</th>
                  <th className="pb-3 font-medium">Security Status</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {filteredDevices.map((device) => (
                  <tr
                    key={device.id}
                    onClick={() => navigate(`/devices/${device.id}`)}
                    className="hover:bg-cyber-cardHover/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 font-bold text-cyber-text flex items-center gap-2">
                      <div className="p-1.5 bg-cyber-bg border border-cyber-border rounded text-cyber-accent">
                        {device.bus_type?.toUpperCase() === 'USB' ? (
                          <Usb className="w-3.5 h-3.5" />
                        ) : (
                          <Server className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="group-hover:text-cyber-accent transition-colors">
                        {device.device_id}
                      </span>
                    </td>

                    <td className="py-3 text-cyber-text">
                      <span className="font-medium block truncate max-w-xs">{device.name}</span>
                      <span className="text-[10px] text-cyber-darkMuted">SN: {device.serial || 'N/A'}</span>
                    </td>

                    <td className="py-3 text-cyber-muted uppercase">{device.bus_type || 'Internal'}</td>

                    <td className="py-3 text-cyber-muted">
                      <StatusBadge status={device.media_type || 'DISK'} size="sm" />
                    </td>

                    <td className="py-3 text-cyber-text font-medium">{formatBytes(device.capacity)}</td>

                    <td className="py-3 text-cyber-accent font-semibold">
                      {device.mount_point || 'Unmounted'}
                    </td>

                    <td className="py-3">
                      {device.is_system ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyber-amber/15 border border-cyber-amber/40 text-cyber-amber text-[10px] font-bold tracking-wider uppercase">
                          <ShieldAlert className="w-3 h-3" />
                          SYSTEM DRIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyber-emerald/15 border border-cyber-emerald/40 text-cyber-emerald text-[10px] font-bold tracking-wider uppercase">
                          <ShieldCheck className="w-3 h-3" />
                          TARGET DISK
                        </span>
                      )}
                    </td>

                    <td className="py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/devices/${device.id}`);
                        }}
                        className="p-1.5 bg-cyber-bg hover:bg-cyber-cardHover border border-cyber-border hover:border-cyber-accent rounded text-cyber-muted hover:text-cyber-accent transition-colors inline-flex items-center gap-1"
                        title="View Full Device Topology"
                      >
                        <span className="text-[10px] uppercase tracking-wider font-semibold mr-1">Inspect</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={HardDrive}
            title="No Storage Devices Detected"
            description="Connect an HDD, SSD, USB drive, memory card, or external storage device and click 'Scan Storage Hardware'."
          />
        )}
      </div>
    </div>
  );
};
