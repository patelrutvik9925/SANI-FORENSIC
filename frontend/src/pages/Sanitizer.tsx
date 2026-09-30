import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Trash2,
  HardDrive,
  File,
  Folder,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FolderOpen,
  Info
} from 'lucide-react';
import { deviceApi, sanitizationApi } from '../services/api';
import { DangerDialog } from '../components/common/DangerDialog';
import { FileBrowserModal } from '../components/sanitizer/FileBrowserModal';
import { ProgressBar } from '../components/common/ProgressBar';
import { StatusBadge } from '../components/common/StatusBadge';
import type { FileBrowseItem, SanitizationJob, FolderSummaryResponse } from '../types';

export const Sanitizer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'drive';
  const preselectedDeviceId = searchParams.get('device');

  const [activeTab, setActiveTab] = useState<'drive' | 'files' | 'folders' | 'standards'>(initialTab);
  const [selectedMethod, setSelectedMethod] = useState<string>('NIST_800_88_CLEAR');

  // Drive Sanitization State
  const [selectedDevicePk, setSelectedDevicePk] = useState<number | null>(
    preselectedDeviceId ? parseInt(preselectedDeviceId, 10) : null
  );

  // File Sanitization State
  const [selectedFile, setSelectedFile] = useState<FileBrowseItem | null>(null);
  const [manualFilePath, setManualFilePath] = useState<string>('');

  // Folder Sanitization State
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [folderSummary, setFolderSummary] = useState<FolderSummaryResponse | null>(null);
  const [isSummarizingFolder, setIsSummarizingFolder] = useState<boolean>(false);

  // Modals State
  const [isDangerModalOpen, setIsDangerModalOpen] = useState<boolean>(false);
  const [dangerTarget, setDangerTarget] = useState<{ id: string; desc: string; type: 'drive' | 'file' | 'folder'; disabled?: boolean; reason?: string }>({
    id: '',
    desc: '',
    type: 'drive',
  });
  const [browserModalOpen, setBrowserModalOpen] = useState<boolean>(false);
  const [browserMode, setBrowserMode] = useState<'file' | 'folder'>('file');

  // Active Job State
  const [activeJob, setActiveJob] = useState<SanitizationJob | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  // Queries
  const { data: devices } = useQuery({
    queryKey: ['devicesList'],
    queryFn: deviceApi.listDevices,
  });

  const { data: methods } = useQuery({
    queryKey: ['sanitizationMethods'],
    queryFn: sanitizationApi.getMethods,
  });

  const selectedDevice = devices?.find((d) => d.id === selectedDevicePk) || (devices && devices.length > 0 ? devices[0] : null);

  useEffect(() => {
    if (!selectedDevicePk && devices && devices.length > 0) {
      setSelectedDevicePk(devices[0].id);
    }
  }, [devices, selectedDevicePk]);

  // Periodic polling for active job progress
  useEffect(() => {
    if (!activeJob || activeJob.status === 'COMPLETED' || activeJob.status === 'FAILED') return;
    const interval = setInterval(async () => {
      try {
        const updated = await sanitizationApi.getJob(activeJob.id);
        setActiveJob(updated);
      } catch {
        // Ignore polling errors
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeJob]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleSelectFolder = async (item: FileBrowseItem) => {
    setSelectedFolder(item.path);
    setIsSummarizingFolder(true);
    setFolderSummary(null);
    try {
      const summary = await sanitizationApi.getFolderSummary(item.path);
      setFolderSummary(summary);
    } catch {
      // Ignored
    } finally {
      setIsSummarizingFolder(false);
    }
  };

  const triggerDriveSanitizeModal = () => {
    if (!selectedDevice) return;
    setDangerTarget({
      id: selectedDevice.device_id,
      desc: `${selectedDevice.name} (${selectedDevice.serial || 'No Serial'}) — ${formatBytes(selectedDevice.capacity)}`,
      type: 'drive',
      disabled: selectedDevice.is_system,
      reason: selectedDevice.is_system
        ? 'Protected System/Boot Drive. Direct sanitization is prohibited to prevent destruction of the running operating system.'
        : undefined,
    });
    setIsDangerModalOpen(true);
  };

  const triggerFileSanitizeModal = () => {
    const path = selectedFile?.path || manualFilePath;
    if (!path) return;
    const filename = path.split(/[\\/]/).pop() || path;
    setDangerTarget({
      id: filename,
      desc: `${path} (${formatBytes(selectedFile?.size || 0)})`,
      type: 'file',
    });
    setIsDangerModalOpen(true);
  };

  const triggerFolderSanitizeModal = () => {
    if (!selectedFolder) return;
    const foldername = selectedFolder.split(/[\\/]/).pop() || selectedFolder;
    setDangerTarget({
      id: foldername,
      desc: `${selectedFolder} (${folderSummary?.total_files || 0} files, ${formatBytes(folderSummary?.total_size || 0)})`,
      type: 'folder',
    });
    setIsDangerModalOpen(true);
  };

  const handleAuthorizeSanitization = async (confirmationPhrase: string) => {
    setIsDangerModalOpen(false);
    setJobError(null);
    try {
      let job: SanitizationJob;
      if (dangerTarget.type === 'drive') {
        job = await sanitizationApi.sanitizeDrive(dangerTarget.id, selectedMethod, confirmationPhrase);
      } else if (dangerTarget.type === 'file') {
        const path = selectedFile?.path || manualFilePath;
        job = await sanitizationApi.sanitizeFile(path, selectedMethod, confirmationPhrase);
      } else {
        job = await sanitizationApi.sanitizeFolder(selectedFolder, selectedMethod, confirmationPhrase);
      }
      setActiveJob(job);
    } catch (err: any) {
      setJobError(err.response?.data?.detail || 'Sanitization job execution failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-mono font-bold text-cyber-text tracking-wide uppercase flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-cyber-rose" />
          Secure Data Sanitization Engine
        </h1>
        <p className="text-xs font-mono text-cyber-muted mt-0.5">
          NIST SP 800-88 Rev. 1 & DoD 5220.22-M compliant physical drive, file, and directory data wiping.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyber-border gap-2">
        <button
          onClick={() => { setActiveTab('drive'); setSearchParams({ tab: 'drive' }); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === 'drive'
              ? 'border-cyber-rose text-cyber-rose font-bold'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Physical Drive Eraser</span>
        </button>

        <button
          onClick={() => { setActiveTab('files'); setSearchParams({ tab: 'files' }); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === 'files'
              ? 'border-cyber-rose text-cyber-rose font-bold'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          <File className="w-4 h-4" />
          <span>Secure File Eraser</span>
        </button>

        <button
          onClick={() => { setActiveTab('folders'); setSearchParams({ tab: 'folders' }); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === 'folders'
              ? 'border-cyber-rose text-cyber-rose font-bold'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Recursive Folder Eraser</span>
        </button>

        <button
          onClick={() => { setActiveTab('standards'); setSearchParams({ tab: 'standards' }); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === 'standards'
              ? 'border-cyber-accent text-cyber-accent font-bold'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Standards & SSD FTL Guidance</span>
        </button>
      </div>

      {/* Error Banner */}
      {jobError && (
        <div className="p-4 bg-cyber-rose/10 border border-cyber-rose/40 rounded-lg flex items-start gap-3 text-xs font-mono text-cyber-rose">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block">SANITIZATION EXECUTION ERROR</span>
            <p className="opacity-90">{jobError}</p>
          </div>
        </div>
      )}

      {/* Active Job Progress Monitor */}
      {activeJob && (
        <div className="p-5 bg-cyber-card border border-cyber-accent/40 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-cyber-border pb-3">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs font-bold text-cyber-text uppercase tracking-wide">
                ACTIVE JOB #{activeJob.id} — {activeJob.job_type} SANITIZATION
              </span>
            </div>
            <StatusBadge status={activeJob.status} size="sm" />
          </div>

          <ProgressBar
            progress={activeJob.progress}
            label={`Target: ${activeJob.target_path}`}
            subLabel={`${formatBytes(activeJob.bytes_processed)} / ${formatBytes(activeJob.total_bytes)} (${activeJob.progress.toFixed(1)}%)`}
            status={activeJob.status as any}
          />

          {activeJob.pre_sanitization_hash && (
            <div className="p-2.5 bg-cyber-bg border border-cyber-border rounded text-[11px] font-mono text-cyber-muted">
              <span>PRE-ERASURE SHA-256: </span>
              <span className="text-cyber-accent font-semibold select-all">{activeJob.pre_sanitization_hash}</span>
            </div>
          )}

          {activeJob.status === 'COMPLETED' && (
            <div className="p-3 bg-cyber-emerald/10 border border-cyber-emerald/40 rounded flex items-center gap-2 text-xs font-mono text-cyber-emerald">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sanitization procedure successfully completed. Target physical space sanitized.</span>
            </div>
          )}
        </div>
      )}

      {/* Method Selection Bar */}
      {activeTab !== 'standards' && (
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg space-y-2">
          <label className="block text-xs font-mono text-cyber-muted uppercase tracking-wider font-semibold">
            Select Sanitization Standard & Overwrite Algorithm
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {methods &&
              Object.entries(methods).map(([key, info]) => (
                <div
                  key={key}
                  onClick={() => setSelectedMethod(key)}
                  className={`p-3 rounded-lg border cursor-pointer font-mono transition-all ${
                    selectedMethod === key
                      ? 'bg-cyber-cardHover border-cyber-rose/70 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                      : 'bg-cyber-bg border-cyber-border hover:border-cyber-borderLight'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-cyber-text truncate">{info.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-card border border-cyber-border text-cyber-muted">
                      {info.passes} {info.passes === 1 ? 'PASS' : 'PASSES'}
                    </span>
                  </div>
                  <p className="text-[11px] text-cyber-muted line-clamp-2">{info.description}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 1: DRIVE ERASER */}
      {activeTab === 'drive' && (
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-cyber-text flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyber-rose" />
              Physical Drive Selection
            </h2>
            <p className="text-xs font-mono text-cyber-muted">
              Select an attached physical storage disk to prepare for low-level block sanitization.
            </p>
          </div>

          {/* Drive Select Dropdown */}
          <div className="space-y-3 font-mono text-xs">
            <label className="block text-cyber-muted uppercase font-semibold text-[11px]">
              Target Storage Medium:
            </label>
            <select
              value={selectedDevice?.id || ''}
              onChange={(e) => setSelectedDevicePk(parseInt(e.target.value, 10))}
              className="w-full p-2.5 bg-cyber-bg border border-cyber-border rounded text-cyber-text font-mono focus:outline-none focus:border-cyber-accent"
            >
              {devices?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.device_id} — {d.name} ({formatBytes(d.capacity)}) {d.is_system ? '[SYSTEM PROTECTED]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Device Preview Card */}
          {selectedDevice && (
            <div className="p-4 bg-cyber-bg border border-cyber-border rounded-lg space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center border-b border-cyber-border pb-2">
                <span className="font-bold text-cyber-text text-sm">{selectedDevice.name}</span>
                <StatusBadge status={selectedDevice.is_system ? 'SYSTEM DRIVE' : 'TARGET DISK'} size="sm" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-cyber-muted block">Identifier:</span>
                  <span className="text-cyber-text font-bold">{selectedDevice.device_id}</span>
                </div>
                <div>
                  <span className="text-cyber-muted block">Capacity:</span>
                  <span className="text-cyber-text font-bold">{formatBytes(selectedDevice.capacity)}</span>
                </div>
                <div>
                  <span className="text-cyber-muted block">Bus Type:</span>
                  <span className="text-cyber-accent font-semibold">{selectedDevice.bus_type || 'Internal'}</span>
                </div>
                <div>
                  <span className="text-cyber-muted block">Mount Point:</span>
                  <span className="text-cyber-text">{selectedDevice.mount_point || 'Unmounted'}</span>
                </div>
              </div>

              {selectedDevice.is_system && (
                <div className="p-3 bg-cyber-amber/10 border border-cyber-amber/30 rounded text-cyber-amber text-xs space-y-1">
                  <span className="font-bold uppercase block">SAFETY BARRIER: SYSTEM DRIVE PROTECTED</span>
                  <p className="text-[11px] opacity-90">
                    This drive contains the active Windows operating system and boot partition. Direct sanitization is locked to protect system integrity.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={triggerDriveSanitizeModal}
              disabled={!selectedDevice || selectedDevice.is_system}
              className="px-5 py-2.5 bg-cyber-rose hover:bg-rose-600 disabled:opacity-30 text-white font-mono font-bold text-xs uppercase tracking-wider rounded transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            >
              <Trash2 className="w-4 h-4" />
              <span>PROCEED TO DRIVE SANITIZATION</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: FILE ERASER */}
      {activeTab === 'files' && (
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-cyber-text flex items-center gap-2">
              <File className="w-4 h-4 text-cyber-rose" />
              Target File Selection
            </h2>
            <p className="text-xs font-mono text-cyber-muted">
              Select an individual file on any mounted volume to overwrite with multi-pass patterns, truncate, and securely unlink.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedFile?.path || manualFilePath}
                onChange={(e) => {
                  setManualFilePath(e.target.value);
                  setSelectedFile(null);
                }}
                placeholder="C:\path\to\target\file.docx"
                className="flex-1 p-2.5 bg-cyber-bg border border-cyber-border rounded text-cyber-text font-mono placeholder-cyber-darkMuted focus:outline-none focus:border-cyber-accent"
              />
              <button
                onClick={() => {
                  setBrowserMode('file');
                  setBrowserModalOpen(true);
                }}
                className="px-4 py-2.5 bg-cyber-bg hover:bg-cyber-cardHover border border-cyber-border hover:border-cyber-accent rounded font-bold text-cyber-accent flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse...</span>
              </button>
            </div>
          </div>

          {selectedFile && (
            <div className="p-4 bg-cyber-bg border border-cyber-border rounded-lg space-y-2 text-xs font-mono">
              <span className="font-bold text-cyber-text uppercase block">Selected File Metadata:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-cyber-muted block">File Size:</span>
                  <span className="text-cyber-text font-bold">{formatBytes(selectedFile.size)}</span>
                </div>
                <div>
                  <span className="text-cyber-muted block">Extension:</span>
                  <span className="text-cyber-accent font-semibold">{selectedFile.extension || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-cyber-muted block">Last Modified:</span>
                  <span className="text-cyber-text">{selectedFile.modified_at?.substring(0, 19) || '—'}</span>
                </div>
                <div>
                  <span className="text-cyber-muted block">Pre-Hash (SHA-256):</span>
                  <span className="text-cyber-text truncate block">{selectedFile.sha256 ? selectedFile.sha256.substring(0, 12) + '...' : 'Available on start'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={triggerFileSanitizeModal}
              disabled={!selectedFile && !manualFilePath}
              className="px-5 py-2.5 bg-cyber-rose hover:bg-rose-600 disabled:opacity-30 text-white font-mono font-bold text-xs uppercase tracking-wider rounded transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            >
              <Trash2 className="w-4 h-4" />
              <span>SECURELY ERASE FILE</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: FOLDER ERASER */}
      {activeTab === 'folders' && (
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-cyber-text flex items-center gap-2">
              <Folder className="w-4 h-4 text-cyber-rose" />
              Recursive Directory Eraser
            </h2>
            <p className="text-xs font-mono text-cyber-muted">
              Recursively sanitize every file within a directory tree and remove directory index structures.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                placeholder="C:\path\to\target\folder"
                className="flex-1 p-2.5 bg-cyber-bg border border-cyber-border rounded text-cyber-text font-mono placeholder-cyber-darkMuted focus:outline-none focus:border-cyber-accent"
              />
              <button
                onClick={() => {
                  setBrowserMode('folder');
                  setBrowserModalOpen(true);
                }}
                className="px-4 py-2.5 bg-cyber-bg hover:bg-cyber-cardHover border border-cyber-border hover:border-cyber-accent rounded font-bold text-cyber-accent flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse Folder...</span>
              </button>
            </div>
          </div>

          {isSummarizingFolder && (
            <div className="p-4 bg-cyber-bg border border-cyber-border rounded text-xs font-mono text-cyber-muted flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyber-accent" />
              <span>Recursively analyzing folder tree and calculating byte totals...</span>
            </div>
          )}

          {folderSummary && (
            <div className="p-4 bg-cyber-bg border border-cyber-border rounded-lg space-y-2 text-xs font-mono">
              <span className="font-bold text-cyber-text uppercase block">Pre-Deletion Directory Summary:</span>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-cyber-muted block">Files to Overwrite:</span>
                  <span className="text-cyber-text font-bold text-sm">{folderSummary.total_files}</span>
                </div>
                <div>
                  <span className="text-cyber-muted block">Subdirectories:</span>
                  <span className="text-cyber-text font-bold text-sm">{folderSummary.total_directories}</span>
                </div>
                <div>
                  <span className="text-cyber-muted block">Total Payload Size:</span>
                  <span className="text-cyber-rose font-bold text-sm">{formatBytes(folderSummary.total_size)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={triggerFolderSanitizeModal}
              disabled={!selectedFolder}
              className="px-5 py-2.5 bg-cyber-rose hover:bg-rose-600 disabled:opacity-30 text-white font-mono font-bold text-xs uppercase tracking-wider rounded transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            >
              <Trash2 className="w-4 h-4" />
              <span>AUTHORIZE RECURSIVE FOLDER WIPING</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: STANDARDS & SSD GUIDANCE */}
      {activeTab === 'standards' && (
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-cyber-text flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyber-accent" />
              Sanitization Compliance & Solid-State Storage Guidance
            </h2>
            <p className="text-xs font-mono text-cyber-muted mt-0.5">
              Technical limitations of software overwriting on NAND flash media and compliance mappings.
            </p>
          </div>

          <div className="p-4 bg-cyber-amber/10 border border-cyber-amber/40 rounded-lg text-xs font-mono text-cyber-amber space-y-2">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              CRITICAL NOTICE: SOLID-STATE DRIVES (SSDs) & FTL LIMITATIONS
            </span>
            <p className="leading-relaxed opacity-90">
              Modern SSDs utilize an internal microcontroller running a Flash Translation Layer (FTL) that handles wear-leveling, bad block reallocation, and over-provisioning.
              Consequently, logical sector overwrite passes (such as zero-fill or random pattern writes) cannot guarantee that all physical NAND flash cells are modified, as retired or over-provisioned blocks remain inaccessible to OS-level block writes.
            </p>
            <p className="leading-relaxed opacity-90">
              Per <strong>NIST SP 800-88 Rev. 1</strong> guidelines, for SSD sanitization, hardware-supported ATA Secure Erase, NVMe Sanitize, or Cryptographic Erase (Cryptographic Key Destruction) should be employed whenever technically available.
            </p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <h3 className="text-xs font-bold text-cyber-text uppercase tracking-wider">
              Documented Standards Reference Matrix:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-cyber-bg border border-cyber-border rounded-lg space-y-2">
                <span className="text-cyber-accent font-bold text-sm">NIST SP 800-88 Rev. 1 (Clear)</span>
                <p className="text-cyber-muted text-[11px]">
                  Overwrites logical storage with a single pass of fixed values (0x00). Appropriate for general media sanitization against non-laboratory recovery techniques.
                </p>
                <div className="text-[10px] text-cyber-darkMuted pt-2 border-t border-cyber-border">
                  Recommended for: Magnetic HDDs, Removable USB Flash
                </div>
              </div>

              <div className="p-4 bg-cyber-bg border border-cyber-border rounded-lg space-y-2">
                <span className="text-cyber-rose font-bold text-sm">DoD 5220.22-M (NISPOM)</span>
                <p className="text-cyber-muted text-[11px]">
                  Requires a 3-pass overwrite: Pass 1 writes binary zeroes (0x00), Pass 2 writes binary ones (0xFF), and Pass 3 writes pseudo-random bytes, followed by read verification.
                </p>
                <div className="text-[10px] text-cyber-darkMuted pt-2 border-t border-cyber-border">
                  Recommended for: Magnetic HDDs
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Browser Modal */}
      <FileBrowserModal
        isOpen={browserModalOpen}
        onClose={() => setBrowserModalOpen(false)}
        onSelect={(item) => {
          if (browserMode === 'file') {
            setSelectedFile(item);
            setManualFilePath(item.path);
          } else {
            handleSelectFolder(item);
          }
        }}
        selectionMode={browserMode}
        title={browserMode === 'file' ? 'Select File to Sanitize' : 'Select Directory to Erase'}
      />

      {/* Safety Confirmation Dialog */}
      <DangerDialog
        isOpen={isDangerModalOpen}
        onClose={() => setIsDangerModalOpen(false)}
        onConfirm={handleAuthorizeSanitization}
        title={`Sanitize ${dangerTarget.type.toUpperCase()}: ${dangerTarget.id}`}
        targetIdentifier={dangerTarget.id}
        targetDescription={dangerTarget.desc}
        isDestructiveDisabled={dangerTarget.disabled}
        disabledReason={dangerTarget.reason}
      />
    </div>
  );
};
