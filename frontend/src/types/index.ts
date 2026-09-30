export type UserRole = 'ADMIN' | 'INVESTIGATOR' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: number;
  username: string;
  role: UserRole;
  full_name?: string | null;
}

export interface DiskPartition {
  device: string;
  mountpoint: string;
  fstype: string;
  opts: string;
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface SystemStatus {
  app_name: string;
  version: string;
  environment: string;
  os_name: string;
  os_version: string;
  os_release: string;
  architecture: string;
  hostname: string;
  is_admin: boolean;
  privilege_level: 'ADMINISTRATOR' | 'STANDARD_USER';
  cpu_count: number;
  cpu_percent: number;
  memory_total: number;
  memory_available: number;
  memory_used: number;
  memory_percent: number;
  partitions: DiskPartition[];
  workspace_disk: {
    path: string;
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  detected_devices_count: number;
  active_operations_count: number;
  completed_operations_count: number;
  failed_operations_count: number;
  timestamp: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user_id?: number | null;
  username?: string | null;
  role?: string | null;
  action: string;
  target_type?: string | null;
  target_identifier?: string | null;
  operation_id?: string | null;
  ip_address?: string | null;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: string | null;
  record_hash: string;
  prev_hash?: string | null;
}

export interface PartitionDetail {
  partition_number: number;
  size: number;
  type?: string | null;
  drive_letter?: string | null;
  is_system: boolean;
  is_boot: boolean;
  volume_label?: string | null;
  filesystem?: string | null;
}

export interface Device {
  id: number;
  device_id: string;
  name: string;
  model?: string | null;
  serial?: string | null;
  vendor?: string | null;
  media_type?: string | null;
  bus_type?: string | null;
  capacity: number;
  used_space: number;
  free_space: number;
  filesystem?: string | null;
  mount_point?: string | null;
  is_removable: boolean;
  is_readonly: boolean;
  is_system: boolean;
  operational_status: string;
  last_detected_at: string;
}

export interface DeviceDetail extends Device {
  partitions: PartitionDetail[];
  sanitization_allowed: boolean;
  sanitization_block_reason?: string | null;
}

export interface SanitizationMethodInfo {
  name: string;
  passes: number;
  standard: string;
  description: string;
  media_types: string;
  ssd_notes: string;
}

export interface SanitizationJob {
  id: number;
  job_type: string;
  target_path: string;
  target_device_id?: string | null;
  method: string;
  passes: number;
  status: string;
  progress: number;
  bytes_processed: number;
  total_bytes: number;
  started_at?: string | null;
  completed_at?: string | null;
  operator_id?: number | null;
  error_message?: string | null;
  pre_sanitization_hash?: string | null;
  post_sanitization_hash?: string | null;
}

export interface FileBrowseItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  extension?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
  accessed_at?: string | null;
  sha256?: string | null;
}

export interface DirectoryBrowseResponse {
  current_path: string;
  parent_path?: string | null;
  items: FileBrowseItem[];
}

export interface FolderSummaryResponse {
  folder_path: string;
  total_files: number;
  total_directories: number;
  total_size: number;
}

export interface AuditVerifyResult {
  status: 'VALID' | 'COMPROMISED';
  total_records: number;
  broken_at_id?: number | null;
  latest_hash?: string | null;
  message: string;
}
