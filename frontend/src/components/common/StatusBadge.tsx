import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'solid',
  size = 'sm',
}) => {
  const normalized = status.toUpperCase().trim();

  let colorClasses = 'bg-cyber-card border-cyber-border text-cyber-muted';

  if (['SUCCESS', 'PASS', 'COMPLETED', 'VALID', 'OK', 'SECURED', 'HIGH', 'ADMINISTRATOR', 'ADMIN'].includes(normalized)) {
    colorClasses = variant === 'solid'
      ? 'bg-cyber-emerald/15 border-cyber-emerald/40 text-cyber-emerald'
      : 'border-cyber-emerald text-cyber-emerald';
  } else if (['RUNNING', 'IN_PROGRESS', 'MEDIUM', 'INVESTIGATOR', 'IN_ANALYSIS'].includes(normalized)) {
    colorClasses = variant === 'solid'
      ? 'bg-cyber-accent/15 border-cyber-accent/40 text-cyber-accent'
      : 'border-cyber-accent text-cyber-accent';
  } else if (['QUEUED', 'PENDING', 'WARNING', 'STANDARD_USER', 'OPERATOR'].includes(normalized)) {
    colorClasses = variant === 'solid'
      ? 'bg-cyber-amber/15 border-cyber-amber/40 text-cyber-amber'
      : 'border-cyber-amber text-cyber-amber';
  } else if (['FAILED', 'FAIL', 'COMPROMISED', 'DENIED', 'CRITICAL', 'CANCELLED', 'ERROR', 'DEGRADED'].includes(normalized)) {
    colorClasses = variant === 'solid'
      ? 'bg-cyber-rose/15 border-cyber-rose/40 text-cyber-rose'
      : 'border-cyber-rose text-cyber-rose';
  } else if (['LOW', 'VIEWER', 'NOT_VERIFIED'].includes(normalized)) {
    colorClasses = variant === 'solid'
      ? 'bg-cyber-borderLight/30 border-cyber-borderLight text-cyber-muted'
      : 'border-cyber-borderLight text-cyber-muted';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded border tracking-wider uppercase ${sizeClasses} ${colorClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
};
