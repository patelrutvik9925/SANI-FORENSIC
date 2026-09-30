import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@SaniForensic2026!');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to connect to forensic backend API. Verify server is running.');
      }
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-cyber-bg px-4 relative overflow-hidden">
      {/* Background Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a243b_1px,transparent_1px),linear-gradient(to_bottom,#1a243b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      <div className="w-full max-w-md bg-cyber-card border border-cyber-border rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-cyber-accent/10 border border-cyber-accent/30 rounded-xl text-cyber-accent mb-4">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-mono font-bold tracking-wider text-cyber-text uppercase">
            SANI-FORENSIC
          </h1>
          <p className="text-xs font-mono text-cyber-muted mt-1 max-w-xs">
            Integrated Secure Data Erasure & Advanced File Recovery Platform
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyber-bg border border-cyber-border text-[10px] font-mono text-cyber-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald" />
            SECURE DFIR TERMINAL
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 bg-cyber-rose/10 border border-cyber-rose/30 rounded flex items-start gap-2.5 text-xs font-mono text-cyber-rose">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-cyber-muted uppercase tracking-wider mb-1.5">
              Operator Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyber-muted">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-cyber-bg border border-cyber-border rounded text-sm text-cyber-text font-mono placeholder-cyber-darkMuted focus:outline-none focus:border-cyber-accent transition-colors"
                placeholder="operator_id"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyber-muted uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyber-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-cyber-bg border border-cyber-border rounded text-sm text-cyber-text font-mono placeholder-cyber-darkMuted focus:outline-none focus:border-cyber-accent transition-colors"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-cyber-accent hover:bg-cyber-accentHover text-black font-mono font-semibold text-xs tracking-wider uppercase rounded transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Authenticate Session</span>
            )}
          </button>
        </form>

        {/* Security notice and default credentials info */}
        <div className="mt-8 pt-6 border-t border-cyber-border text-center">
          <p className="text-[11px] font-mono text-cyber-muted">
            Default bootstrap credentials:
          </p>
          <p className="text-[11px] font-mono text-cyber-accent mt-0.5">
            admin / Admin@SaniForensic2026!
          </p>
          <p className="text-[10px] font-mono text-cyber-darkMuted mt-3">
            Authorized cybersecurity personnel only. All access attempts are cryptographically audited.
          </p>
        </div>
      </div>
    </div>
  );
};
