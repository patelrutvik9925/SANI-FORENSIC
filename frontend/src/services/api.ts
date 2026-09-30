import axios from 'axios';
import type {
  LoginResponse, SystemStatus, AuditLog, AuditVerifyResult, User, Device, DeviceDetail,
  SanitizationMethodInfo, SanitizationJob, DirectoryBrowseResponse, FolderSummaryResponse
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sani_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if session expired
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('sani_token');
        localStorage.removeItem('sani_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', { username, password });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('sani_token');
      localStorage.removeItem('sani_user');
    }
  },
};

export const systemApi = {
  getStatus: async (): Promise<SystemStatus> => {
    const res = await api.get<SystemStatus>('/system/status');
    return res.data;
  },
  getHealth: async (): Promise<{ status: string; database_connected: boolean }> => {
    const res = await api.get('/system/health');
    return res.data;
  },
};

export const auditApi = {
  getLogs: async (params?: { action?: string; username?: string; result?: string; limit?: number; offset?: number }): Promise<AuditLog[]> => {
    const res = await api.get<AuditLog[]>('/audit', { params });
    return res.data;
  },
  verify: async (): Promise<AuditVerifyResult> => {
    const res = await api.get<AuditVerifyResult>('/audit/verify');
    return res.data;
  },
  getExportUrl: (format: 'csv' | 'json' = 'csv'): string => {
    const token = localStorage.getItem('sani_token');
    return `/api/audit/export?format=${format}&token=${token || ''}`;
  },
};

export const deviceApi = {
  listDevices: async (): Promise<Device[]> => {
    const res = await api.get<Device[]>('/devices');
    return res.data;
  },
  getDevice: async (id: number): Promise<DeviceDetail> => {
    const res = await api.get<DeviceDetail>(`/devices/${id}`);
    return res.data;
  },
  scanDevice: async (id: number): Promise<DeviceDetail> => {
    const res = await api.post<DeviceDetail>(`/devices/${id}/scan`);
    return res.data;
  },
};

export const sanitizationApi = {
  getMethods: async (): Promise<Record<string, SanitizationMethodInfo>> => {
    const res = await api.get<Record<string, SanitizationMethodInfo>>('/sanitization/methods');
    return res.data;
  },
  browse: async (path?: string): Promise<DirectoryBrowseResponse> => {
    const res = await api.get<DirectoryBrowseResponse>('/sanitization/browse', {
      params: { path: path || undefined },
    });
    return res.data;
  },
  getFolderSummary: async (folderPath: string): Promise<FolderSummaryResponse> => {
    const res = await api.post<FolderSummaryResponse>('/sanitization/folder-summary', null, {
      params: { folder_path: folderPath },
    });
    return res.data;
  },
  sanitizeFile: async (filePath: string, method: string, confirmationPhrase: string): Promise<SanitizationJob> => {
    const res = await api.post<SanitizationJob>('/sanitization/file', {
      file_path: filePath,
      method,
      confirmation_phrase: confirmationPhrase,
    });
    return res.data;
  },
  sanitizeFolder: async (folderPath: string, method: string, confirmationPhrase: string): Promise<SanitizationJob> => {
    const res = await api.post<SanitizationJob>('/sanitization/folder', {
      folder_path: folderPath,
      method,
      confirmation_phrase: confirmationPhrase,
    });
    return res.data;
  },
  sanitizeDrive: async (deviceId: string, method: string, confirmationPhrase: string): Promise<SanitizationJob> => {
    const res = await api.post<SanitizationJob>('/sanitization/drive', {
      device_id: deviceId,
      method,
      confirmation_phrase: confirmationPhrase,
    });
    return res.data;
  },
  getJob: async (jobId: number): Promise<SanitizationJob> => {
    const res = await api.get<SanitizationJob>(`/sanitization/${jobId}`);
    return res.data;
  },
};

export default api;
