import React, { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'sanitization' | 'recovery'>('general');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-mono font-bold text-cyber-text tracking-wide uppercase flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-cyber-accent" />
          Platform Settings & Governance
        </h1>
        <p className="text-xs font-mono text-cyber-muted mt-0.5">
          System policies, forensic directory repositories, and security thresholds.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyber-border gap-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === 'general'
              ? 'border-cyber-accent text-cyber-accent'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          General & Environment
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-cyber-accent text-cyber-accent'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          Security & Access Control
        </button>
        <button
          onClick={() => setActiveTab('sanitization')}
          className={`px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === 'sanitization'
              ? 'border-cyber-accent text-cyber-accent'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          Sanitization Standards
        </button>
        <button
          onClick={() => setActiveTab('recovery')}
          className={`px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === 'recovery'
              ? 'border-cyber-accent text-cyber-accent'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          Carving Engine Rules
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'general' && (
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-cyber-text mb-1">
              Environment & Storage Paths
            </h3>
            <p className="text-xs font-mono text-cyber-muted">
              Standard local data repositories for SANI-FORENSIC artifacts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-cyber-bg border border-cyber-border rounded space-y-1">
              <span className="text-cyber-muted uppercase">Evidence Repository</span>
              <p className="text-cyber-text font-semibold truncate">data/evidence/</p>
            </div>
            <div className="p-3 bg-cyber-bg border border-cyber-border rounded space-y-1">
              <span className="text-cyber-muted uppercase">Recovery Output Directory</span>
              <p className="text-cyber-text font-semibold truncate">data/recovery/</p>
            </div>
            <div className="p-3 bg-cyber-bg border border-cyber-border rounded space-y-1">
              <span className="text-cyber-muted uppercase">Cryptographic Audit Logs</span>
              <p className="text-cyber-text font-semibold truncate">data/logs/</p>
            </div>
            <div className="p-3 bg-cyber-bg border border-cyber-border rounded space-y-1">
              <span className="text-cyber-muted uppercase">Sealed PDF Reports</span>
              <p className="text-cyber-text font-semibold truncate">data/reports/</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-cyber-text mb-1">
              Active Operator Session
            </h3>
            <p className="text-xs font-mono text-cyber-muted">
              Authentication token lifecycle and role permissions.
            </p>
          </div>

          <div className="p-4 bg-cyber-bg border border-cyber-border rounded space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-cyber-muted">Operator Username:</span>
              <span className="text-cyber-text font-semibold">{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyber-muted">Role Authority:</span>
              <span className="text-cyber-accent font-semibold">{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyber-muted">Token Expiration:</span>
              <span className="text-cyber-text">480 Minutes (8 Hours)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyber-muted">Cryptographic Ledger:</span>
              <span className="text-cyber-emerald font-semibold">ENABLED (SHA-256 Chaining)</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sanitization' && (
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-cyber-text mb-1">
              Sanitization Compliance Mapping
            </h3>
            <p className="text-xs font-mono text-cyber-muted">
              Designed with reference to recognized standards (NIST SP 800-88 Rev. 1, ISO/IEC 27040).
            </p>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-cyber-bg border border-cyber-border rounded">
              <div className="flex justify-between font-semibold text-cyber-text">
                <span>NIST SP 800-88 Rev. 1 (Clear)</span>
                <span className="text-cyber-accent">1 PASS ZERO-FILL</span>
              </div>
              <p className="text-[11px] text-cyber-muted mt-1">
                Logical overwrite of all addressable storage locations with logical zeroes.
              </p>
            </div>

            <div className="p-3 bg-cyber-bg border border-cyber-border rounded">
              <div className="flex justify-between font-semibold text-cyber-text">
                <span>DoD 5220.22-M Standard</span>
                <span className="text-cyber-accent">3 PASSES (ZERO / ONE / RANDOM)</span>
              </div>
              <p className="text-[11px] text-cyber-muted mt-1">
                Multi-pass destructive overwrite with complementary patterns and random noise.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recovery' && (
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-cyber-text mb-1">
              Forensic Carving Signatures
            </h3>
            <p className="text-xs font-mono text-cyber-muted">
              Recognized magic byte signatures and structural validators.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {['JPEG (FF D8 FF)', 'PNG (89 50 4E 47)', 'PDF (%PDF-)', 'ZIP / DOCX / XLSX (50 4B 03 04)', 'MP4 (ftyp)', 'MP3 (ID3 / FFFB)'].map((sig) => (
              <div key={sig} className="p-2.5 bg-cyber-bg border border-cyber-border rounded text-cyber-text">
                {sig}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
