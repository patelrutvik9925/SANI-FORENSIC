import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Cpu } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  phase: string;
  icon?: LucideIcon;
  plannedCapabilities: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  phase,
  icon: Icon = Cpu,
  plannedCapabilities,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-mono font-bold text-cyber-text tracking-wide uppercase flex items-center gap-2">
          <Icon className="w-5 h-5 text-cyber-accent" />
          {title}
        </h1>
        <p className="text-xs font-mono text-cyber-muted mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Phase Staging Banner */}
      <div className="p-6 bg-cyber-card border border-cyber-border rounded-lg text-center flex flex-col items-center justify-center py-16">
        <div className="p-3.5 bg-cyber-bg border border-cyber-border rounded-full text-cyber-accent mb-4">
          <Icon className="w-8 h-8 opacity-80" />
        </div>

        <span className="px-3 py-1 bg-cyber-accent/15 border border-cyber-accent/40 text-cyber-accent text-xs font-mono font-semibold rounded uppercase tracking-wider mb-2">
          {phase}
        </span>

        <h2 className="text-base font-mono font-bold text-cyber-text tracking-wide uppercase mb-2">
          Module Awaiting Phased Engine Activation
        </h2>

        <p className="text-xs font-mono text-cyber-muted max-w-lg mb-6 leading-relaxed">
          In strict compliance with the project rule against mock, simulated, or synthetic data, this interface will activate upon implementing the underlying OS hardware integration and forensic engine services.
        </p>

        <div className="w-full max-w-md bg-cyber-bg border border-cyber-border rounded-lg p-4 text-left">
          <span className="text-[11px] font-mono text-cyber-muted uppercase tracking-wider block mb-2 font-semibold">
            Planned Technical Capabilities:
          </span>
          <ul className="space-y-1.5 text-xs font-mono text-cyber-text">
            {plannedCapabilities.map((cap, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
