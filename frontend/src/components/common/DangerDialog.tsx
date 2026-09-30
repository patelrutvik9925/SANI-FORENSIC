import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, Loader2 } from 'lucide-react';

interface DangerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (phrase: string) => void;
  title: string;
  targetIdentifier: string;
  targetDescription: string;
  isDestructiveDisabled?: boolean;
  disabledReason?: string | null;
  isLoading?: boolean;
}

export const DangerDialog: React.FC<DangerDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  targetIdentifier,
  targetDescription,
  isDestructiveDisabled = false,
  disabledReason,
  isLoading = false,
}) => {
  const [typedPhrase, setTypedPhrase] = useState('');
  const requiredPhrase = `ERASE ${targetIdentifier.trim()}`;
  const isMatch = typedPhrase.trim() === requiredPhrase;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-cyber-card border-2 border-cyber-rose/60 rounded-xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)]">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyber-rose/20 border border-cyber-rose/50 rounded-lg text-cyber-rose">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-cyber-rose uppercase font-bold block">
                CRITICAL DESTRUCTIVE ACTION
              </span>
              <h3 className="text-base font-mono font-bold text-cyber-text uppercase tracking-wide">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-cyber-muted hover:text-cyber-text rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3 bg-cyber-rose/10 border border-cyber-rose/30 rounded-lg mb-4 text-xs font-mono text-cyber-rose space-y-1">
          <div className="font-bold flex items-center gap-1.5 uppercase">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>WARNING: IRREVERSIBLE DATA LOSS</span>
          </div>
          <p className="opacity-90 leading-relaxed text-[11px]">
            This operation permanently overwrites physical sectors. Once executed, data cannot be recovered even by advanced file carving techniques.
          </p>
        </div>

        {/* Target Details */}
        <div className="p-3 bg-cyber-bg border border-cyber-border rounded-lg mb-4 space-y-1 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-cyber-muted">Target Identifier:</span>
            <span className="text-cyber-text font-bold">{targetIdentifier}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyber-muted">Hardware / Path:</span>
            <span className="text-cyber-text truncate max-w-xs">{targetDescription}</span>
          </div>
        </div>

        {/* Disabled Reason (e.g. System Drive or Not Admin) */}
        {isDestructiveDisabled ? (
          <div className="p-3 bg-cyber-amber/10 border border-cyber-amber/30 rounded-lg mb-4 text-xs font-mono text-cyber-amber">
            <span className="font-bold uppercase block mb-1">SAFETY BARRIER ACTIVE:</span>
            <p className="text-[11px] opacity-90">{disabledReason || 'Action locked by forensic security policy.'}</p>
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            <label className="block text-xs font-mono text-cyber-muted">
              To authorize this destructive sanitization, type exactly:
              <span className="block text-cyber-rose font-bold select-all mt-1 bg-cyber-bg px-2 py-1 rounded border border-cyber-rose/30">
                {requiredPhrase}
              </span>
            </label>
            <input
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              placeholder={requiredPhrase}
              className="w-full px-3 py-2 bg-cyber-bg border border-cyber-border focus:border-cyber-rose rounded text-xs font-mono text-cyber-text focus:outline-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-cyber-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-cyber-bg hover:bg-cyber-cardHover border border-cyber-border text-xs font-mono text-cyber-muted hover:text-cyber-text rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isMatch || isDestructiveDisabled || isLoading}
            onClick={() => onConfirm(typedPhrase)}
            className="px-4 py-2 bg-cyber-rose hover:bg-rose-600 disabled:opacity-30 disabled:hover:bg-cyber-rose text-white font-mono font-bold text-xs uppercase tracking-wider rounded transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>AUTHORIZE SANITIZATION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
