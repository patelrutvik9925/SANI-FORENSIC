import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ShieldAlert } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = ShieldAlert,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-dashed border-cyber-border rounded-lg bg-cyber-card/30">
      <div className="p-3 bg-cyber-card border border-cyber-border rounded-full text-cyber-muted mb-4">
        <Icon className="w-8 h-8 opacity-70" />
      </div>
      <h3 className="text-base font-semibold text-cyber-text tracking-wide mb-1 font-mono uppercase">
        {title}
      </h3>
      <p className="text-sm text-cyber-muted max-w-md mb-5 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-cyber-card hover:bg-cyber-cardHover border border-cyber-accent/40 text-cyber-accent hover:border-cyber-accent text-xs font-mono font-medium rounded transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
