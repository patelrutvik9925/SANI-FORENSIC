import React, { useState, useEffect } from 'react';
import { Menu, LogOut, User, Clock } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { StatusBadge } from '../components/common/StatusBadge';
import type { SystemStatus } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  systemStatus?: SystemStatus | null;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, systemStatus }) => {
  const { user, logout } = useAuthStore();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-cyber-card border-b border-cyber-border px-4 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-cyber-muted hover:text-cyber-text hover:bg-cyber-cardHover rounded border border-cyber-border transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-cyber-muted">
          <Clock className="w-3.5 h-3.5 text-cyber-accent" />
          <span>{time}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Elevation status badge */}
        {systemStatus && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[11px] font-mono text-cyber-muted">OS PRIVILEGE:</span>
            <StatusBadge
              status={systemStatus.is_admin ? 'ADMINISTRATOR' : 'STANDARD_USER'}
              variant="solid"
              size="sm"
            />
          </div>
        )}

        {/* User profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-cyber-border">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-xs font-mono font-semibold text-cyber-text">
              {user?.username || 'ANONYMOUS'}
            </span>
            <span className="text-[10px] font-mono text-cyber-muted">
              {user?.role || 'OPERATOR'}
            </span>
          </div>

          <div className="w-8 h-8 rounded bg-cyber-accent/10 border border-cyber-accent/40 flex items-center justify-center text-cyber-accent">
            <User className="w-4 h-4" />
          </div>

          <button
            onClick={() => logout()}
            className="p-2 text-cyber-muted hover:text-cyber-rose hover:bg-cyber-rose/10 rounded border border-transparent hover:border-cyber-rose/30 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
