import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  HardDrive,
  RotateCcw,
  Trash2,
  CheckCircle2,
  FolderArchive,
  BarChart3,
  FileText,
  History,
  Settings,
  Shield,
  Radio
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Devices', path: '/devices', icon: HardDrive },
    { label: 'Recovery', path: '/recovery', icon: RotateCcw },
    { label: 'Sanitizer', path: '/sanitizer', icon: Trash2 },
    { label: 'Verification', path: '/verify', icon: CheckCircle2 },
    { label: 'Evidence', path: '/evidence', icon: FolderArchive },
    { label: 'Analysis', path: '/analysis', icon: BarChart3 },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Audit Logs', path: '/audit', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-cyber-card border-r border-cyber-border flex flex-col transition-all duration-300 z-20 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-cyber-border gap-3">
        <div className="p-2 bg-cyber-accent/10 border border-cyber-accent/40 rounded text-cyber-accent flex-shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-mono font-bold tracking-wider text-sm text-cyber-text truncate">
              SANI-FORENSIC
            </span>
            <span className="text-[10px] font-mono text-cyber-muted truncate">
              DFIR & DATA WIPER
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-xs font-mono transition-all duration-150 group ${
                  isActive
                    ? 'bg-cyber-accent/15 border border-cyber-accent/50 text-cyber-accent font-semibold shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-cardHover border border-transparent'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0 group-hover:text-cyber-accent transition-colors" />
              {!collapsed && <span className="truncate tracking-wide">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Engine Status Tag */}
      {!collapsed && (
        <div className="p-3 border-t border-cyber-border">
          <div className="p-2.5 bg-cyber-bg border border-cyber-border rounded text-[11px] font-mono flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyber-emerald animate-pulse flex-shrink-0" />
            <span className="text-cyber-muted truncate">FORENSIC ENGINE:</span>
            <span className="text-cyber-emerald font-semibold ml-auto">ONLINE</span>
          </div>
        </div>
      )}
    </aside>
  );
};
