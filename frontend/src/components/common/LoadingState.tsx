import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading forensic telemetry...",
  subMessage,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-4">
        <Loader2 className="w-8 h-8 text-cyber-accent animate-spin" />
        <div className="absolute inset-0 w-8 h-8 border border-cyber-accent/20 rounded-full animate-ping pointer-events-none" />
      </div>
      <p className="text-sm font-mono font-medium text-cyber-text tracking-wide uppercase">
        {message}
      </p>
      {subMessage && (
        <p className="text-xs font-mono text-cyber-muted mt-1">
          {subMessage}
        </p>
      )}
    </div>
  );
};
