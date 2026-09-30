import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface PermissionBannerProps {
  isAdmin: boolean;
  privilegeLevel: string;
}

export const PermissionBanner: React.FC<PermissionBannerProps> = ({
  isAdmin,
  privilegeLevel,
}) => {
  if (isAdmin) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-cyber-emerald/10 border border-cyber-emerald/30 rounded text-xs font-mono text-cyber-emerald">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="font-semibold uppercase tracking-wider">ELEVATED PRIVILEGES DETECTED</span>
          <span className="opacity-80">({privilegeLevel}) — Low-level physical disk access and sanitization commands authorized.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-cyber-amber/10 border border-cyber-amber/30 rounded text-xs font-mono text-cyber-amber">
      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <span className="font-semibold uppercase tracking-wider">STANDARD USER PRIVILEGES</span>
        <span className="opacity-80">({privilegeLevel}) — Low-level physical drive sanitization requires running SANI-FORENSIC as Administrator.</span>
      </div>
    </div>
  );
};
