import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { AppLayout } from './layouts/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { DeviceDetail } from './pages/DeviceDetail';
import { Sanitizer } from './pages/Sanitizer';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { RotateCcw, CheckCircle2, FolderArchive, BarChart3, FileText } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Phase 2: Hardware & Device Inspection */}
              <Route path="/devices" element={<Devices />} />
              <Route path="/devices/:id" element={<DeviceDetail />} />

              {/* Phase 4: Recovery & File Carving */}
              <Route
                path="/recovery"
                element={
                  <PlaceholderPage
                    title="Forensic Recovery & File Carving"
                    subtitle="Read-only signature carving, magic byte analysis, and confidence scoring."
                    phase="Scheduled for Phase 4"
                    icon={RotateCcw}
                    plannedCapabilities={[
                      'Read-only raw image and partition scanning',
                      'Magic byte carving: JPEG, PNG, PDF, ZIP, DOCX, XLSX',
                      'Calculated confidence scoring model (High, Medium, Low)',
                      'Sandboxed safe preview (Hex, Text, Image renderer)',
                    ]}
                  />
                }
              />

              {/* Phase 3: Secure Data Sanitization */}
              <Route path="/sanitizer" element={<Sanitizer />} />
              <Route path="/sanitizer/:tab" element={<Sanitizer />} />

              {/* Phase 6: Bitwise Verification */}
              <Route
                path="/verify"
                element={
                  <PlaceholderPage
                    title="Sanitization Verification"
                    subtitle="Bitwise sector sampling and cryptographic erasure validation."
                    phase="Scheduled for Phase 6"
                    icon={CheckCircle2}
                    plannedCapabilities={[
                      'Bitwise sector sampling across drive sectors',
                      'Zero-ratio calculation and verification pass/fail scoring',
                      'Source vs exported file hash comparison (SHA-256)',
                      'Cryptographic verification seal generation',
                    ]}
                  />
                }
              />

              {/* Phase 5: Evidence Management & Chain of Custody */}
              <Route
                path="/evidence"
                element={
                  <PlaceholderPage
                    title="Evidence Custody & Artifacts"
                    subtitle="Secured evidence vault, hash verification, and chain-of-custody tracking."
                    phase="Scheduled for Phase 5"
                    icon={FolderArchive}
                    plannedCapabilities={[
                      'Evidence acquisition and automated SHA-256 sealing',
                      'Immutable chain-of-custody event logging',
                      'Case association and investigator identity tracking',
                      'Integrity verification against tampering',
                    ]}
                  />
                }
              />

              {/* Analysis */}
              <Route
                path="/analysis"
                element={
                  <PlaceholderPage
                    title="Forensic Timeline & Metadata Analysis"
                    subtitle="File system timeline analysis and artifact metadata inspection."
                    phase="Scheduled for Phase 4 & 5"
                    icon={BarChart3}
                    plannedCapabilities={[
                      'EXIF, document author, and GPS metadata extraction',
                      'Filesystem MACB timestamp timeline correlation',
                      'Fragment analysis and reconstruction indicators',
                      'Exportable forensic finding summaries',
                    ]}
                  />
                }
              />

              {/* Phase 7: Sealed Forensic Reports */}
              <Route
                path="/reports"
                element={
                  <PlaceholderPage
                    title="Sealed Forensic Reports"
                    subtitle="Court-admissible PDF generation with cryptographic SHA-256 seals."
                    phase="Scheduled for Phase 7"
                    icon={FileText}
                    plannedCapabilities={[
                      'ReportLab automated PDF generation with case headers',
                      'Chain-of-custody logs and hardware specifications',
                      'Sanitization certificates and recovery inventories',
                      'Cryptographic report hash seal verification',
                    ]}
                  />
                }
              />

              {/* Phase 1 Implemented: Audit Logs & Settings */}
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
