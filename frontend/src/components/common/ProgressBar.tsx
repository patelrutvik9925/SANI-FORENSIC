import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  subLabel?: string;
  status?: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'QUEUED';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  subLabel,
  status = 'RUNNING',
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  let barColor = 'bg-cyber-accent';
  if (status === 'COMPLETED') barColor = 'bg-cyber-emerald';
  if (status === 'FAILED') barColor = 'bg-cyber-rose';
  if (status === 'QUEUED') barColor = 'bg-cyber-amber';

  return (
    <div className="w-full space-y-1.5">
      {(label || subLabel) && (
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-cyber-text font-medium">{label}</span>
          <span className="text-cyber-muted">{subLabel || `${clamped.toFixed(1)}%`}</span>
        </div>
      )}
      <div className="w-full h-2 bg-cyber-card border border-cyber-border rounded overflow-hidden p-0.5">
        <div
          className={`h-full rounded-sm transition-all duration-300 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
