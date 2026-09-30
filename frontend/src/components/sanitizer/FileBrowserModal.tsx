import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Folder,
  File,
  HardDrive,
  ArrowUp,
  X,
  Check,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { sanitizationApi } from '../../services/api';
import { LoadingState } from '../common/LoadingState';
import type { FileBrowseItem } from '../../types';

interface FileBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: FileBrowseItem) => void;
  selectionMode?: 'file' | 'folder';
  title?: string;
}

export const FileBrowserModal: React.FC<FileBrowserModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectionMode = 'file',
  title = 'Browse Local Filesystem',
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['browseFilesystem', currentPath],
    queryFn: () => sanitizationApi.browse(currentPath || undefined),
    enabled: isOpen,
  });

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (!isOpen) return null;

  const handleItemClick = (item: FileBrowseItem) => {
    if (item.is_dir) {
      setCurrentPath(item.path);
    } else if (selectionMode === 'file') {
      onSelect(item);
      onClose();
    }
  };

  const handleSelectCurrentFolder = () => {
    if (currentPath) {
      onSelect({
        name: currentPath.split(/[\\/]/).pop() || currentPath,
        path: currentPath,
        is_dir: true,
        size: 0,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-cyber-card border border-cyber-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-cyber-accent" />
            <h3 className="font-mono font-bold text-sm uppercase tracking-wide text-cyber-text">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-cyber-muted hover:text-cyber-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Path Bar & Controls */}
        <div className="px-4 py-3 bg-cyber-bg border-b border-cyber-border flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => data?.parent_path !== undefined && setCurrentPath(data.parent_path || '')}
            disabled={!currentPath}
            className="p-1.5 bg-cyber-card hover:bg-cyber-cardHover disabled:opacity-30 border border-cyber-border rounded text-cyber-muted hover:text-cyber-text transition-colors"
            title="Up to Parent Directory"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 px-2.5 py-1 bg-cyber-card border border-cyber-border rounded text-cyber-text truncate text-[11px]">
            {currentPath || 'System Storage Roots'}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-1.5 bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border rounded text-cyber-muted hover:text-cyber-text transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Directory Listing */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
          {isLoading ? (
            <LoadingState message="Reading directory entries..." />
          ) : data?.items && data.items.length > 0 ? (
            <div className="space-y-1">
              {data.items.map((item) => (
                <div
                  key={item.path}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-center justify-between p-2 rounded border border-transparent hover:border-cyber-border transition-colors cursor-pointer group ${
                    item.is_dir
                      ? 'hover:bg-cyber-cardHover/70 text-cyber-text'
                      : selectionMode === 'file'
                      ? 'hover:bg-cyber-accent/10 hover:border-cyber-accent/30 text-cyber-text'
                      : 'opacity-60 text-cyber-muted cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate max-w-md">
                    {item.is_dir ? (
                      item.path.length <= 3 ? (
                        <HardDrive className="w-4 h-4 text-cyber-accent flex-shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-cyber-blue flex-shrink-0" />
                      )
                    ) : (
                      <File className="w-4 h-4 text-cyber-muted flex-shrink-0" />
                    )}
                    <span className="truncate font-medium group-hover:text-cyber-accent transition-colors">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-cyber-muted flex-shrink-0">
                    {!item.is_dir && <span>{formatBytes(item.size)}</span>}
                    {item.is_dir ? (
                      <span className="text-cyber-blue text-[10px] uppercase font-semibold">DIR</span>
                    ) : (
                      <span className="text-cyber-darkMuted uppercase">{item.extension || 'FILE'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-10 text-cyber-muted">
              Directory is empty.
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-cyber-border flex items-center justify-between bg-cyber-card/50">
          <span className="text-[11px] font-mono text-cyber-muted">
            {selectionMode === 'folder'
              ? 'Navigate into directory and click Select Folder'
              : 'Click any file to select for secure erasure'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-cyber-bg hover:bg-cyber-cardHover border border-cyber-border rounded text-xs font-mono text-cyber-muted hover:text-cyber-text transition-colors"
            >
              Cancel
            </button>
            {selectionMode === 'folder' && (
              <button
                onClick={handleSelectCurrentFolder}
                disabled={!currentPath}
                className="px-3 py-1.5 bg-cyber-accent hover:bg-cyber-accentHover disabled:opacity-40 text-black font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Select Folder</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
