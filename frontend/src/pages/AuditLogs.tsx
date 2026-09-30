import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  ShieldCheck,
  Download,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { auditApi } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import type { AuditVerifyResult } from '../types';

export const AuditLogs: React.FC = () => {
  const [actionFilter, setActionFilter] = useState<string>('');
  const [resultFilter, setResultFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<AuditVerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['auditLogs', actionFilter, resultFilter],
    queryFn: () =>
      auditApi.getLogs({
        action: actionFilter || undefined,
        result: resultFilter || undefined,
        limit: 250,
      }),
  });

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await auditApi.verify();
      setVerifyResult(res);
    } catch (err) {
      setVerifyResult({
        status: 'COMPROMISED',
        total_records: 0,
        message: 'Failed to complete cryptographic verification check.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    window.open(auditApi.getExportUrl(format), '_blank');
  };

  // Client-side search filter
  const filteredLogs = logs?.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.username && log.username.toLowerCase().includes(q)) ||
      (log.target_identifier && log.target_identifier.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      log.record_hash.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-cyber-text tracking-wide uppercase flex items-center gap-2">
            <History className="w-5 h-5 text-cyber-accent" />
            Immutable Audit Trail Ledger
          </h1>
          <p className="text-xs font-mono text-cyber-muted mt-0.5">
            Tamper-evident, cryptographically chained SHA-256 event records for regulatory compliance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-card hover:bg-cyber-cardHover border border-cyber-accent/40 hover:border-cyber-accent rounded text-xs font-mono text-cyber-accent font-medium transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isVerifying ? 'Verifying Chain...' : 'Verify Cryptographic Integrity'}</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border rounded text-xs font-mono text-cyber-muted hover:text-cyber-text transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Verification Modal/Banner */}
      {verifyResult && (
        <div
          className={`p-4 rounded-lg border font-mono text-xs ${
            verifyResult.status === 'VALID'
              ? 'bg-cyber-emerald/10 border-cyber-emerald/40 text-cyber-emerald'
              : 'bg-cyber-rose/10 border-cyber-rose/40 text-cyber-rose'
          }`}
        >
          <div className="flex items-start gap-3">
            {verifyResult.status === 'VALID' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold tracking-wider uppercase flex items-center gap-2">
                <span>AUDIT CHAIN STATUS: {verifyResult.status}</span>
                <span className="opacity-80 font-normal">({verifyResult.total_records} records checked)</span>
              </div>
              <p className="text-[11px] opacity-90">{verifyResult.message}</p>
              {verifyResult.latest_hash && (
                <p className="text-[10px] text-cyber-muted truncate max-w-xl">
                  Latest Hash Seal: {verifyResult.latest_hash}
                </p>
              )}
            </div>
            <button
              onClick={() => setVerifyResult(null)}
              className="ml-auto text-cyber-muted hover:text-cyber-text text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-cyber-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, user, hash..."
            className="w-full pl-9 pr-3 py-1.5 bg-cyber-bg border border-cyber-border rounded text-xs font-mono text-cyber-text placeholder-cyber-darkMuted focus:outline-none focus:border-cyber-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs font-mono text-cyber-muted">
            <Filter className="w-3.5 h-3.5" />
            <span>Action:</span>
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g. USER_LOGIN"
              className="bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-xs font-mono text-cyber-text focus:outline-none focus:border-cyber-accent w-32"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-cyber-muted">
            <span>Result:</span>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-xs font-mono text-cyber-text focus:outline-none focus:border-cyber-accent"
            >
              <option value="">All Results</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="DENIED">DENIED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          <button
            onClick={() => refetch()}
            className="p-1.5 bg-cyber-bg border border-cyber-border rounded text-cyber-muted hover:text-cyber-text transition-colors"
            title="Reload Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-cyber-card border border-cyber-border rounded-lg p-5">
        {isLoading ? (
          <LoadingState message="Loading immutable audit logs..." />
        ) : filteredLogs && filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-cyber-border text-cyber-muted text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-medium">Log ID</th>
                  <th className="pb-3 font-medium">Timestamp (UTC)</th>
                  <th className="pb-3 font-medium">Operator / Role</th>
                  <th className="pb-3 font-medium">Action Event</th>
                  <th className="pb-3 font-medium">Target Identifier</th>
                  <th className="pb-3 font-medium">Outcome</th>
                  <th className="pb-3 font-medium">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-cyber-cardHover/50 transition-colors">
                    <td className="py-2.5 text-cyber-darkMuted text-[11px]">#{log.id}</td>
                    <td className="py-2.5 text-cyber-muted">
                      {log.timestamp ? log.timestamp.replace('T', ' ').substring(0, 19) : ''}
                    </td>
                    <td className="py-2.5 text-cyber-text">
                      <span className="font-semibold">{log.username || 'SYSTEM'}</span>
                      <span className="text-[10px] text-cyber-muted ml-1.5">({log.role || 'SYS'})</span>
                    </td>
                    <td className="py-2.5 text-cyber-accent font-medium">{log.action}</td>
                    <td className="py-2.5 text-cyber-muted max-w-xs truncate" title={log.target_identifier || ''}>
                      {log.target_identifier || '—'}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={log.result} size="sm" />
                    </td>
                    <td className="py-2.5 text-cyber-darkMuted text-[10px] truncate max-w-xs" title={log.record_hash}>
                      {log.record_hash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={History}
            title="No Matching Audit Records"
            description="No audit records matched the filter criteria. All platform operations will be immutably recorded here."
          />
        )}
      </div>
    </div>
  );
};
