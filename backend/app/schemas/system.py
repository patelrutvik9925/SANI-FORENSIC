from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class DiskPartitionInfo(BaseModel):
    device: str
    mountpoint: str
    fstype: str
    opts: str
    total: int
    used: int
    free: int
    percent: float

class SystemStatusResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    os_name: str
    os_version: str
    os_release: str
    architecture: str
    hostname: str
    is_admin: bool
    privilege_level: str # "ADMINISTRATOR" or "STANDARD_USER"
    cpu_count: int
    cpu_percent: float
    memory_total: int
    memory_available: int
    memory_used: int
    memory_percent: float
    partitions: List[DiskPartitionInfo]
    workspace_disk: Dict[str, Any]
    detected_devices_count: int
    active_operations_count: int
    completed_operations_count: int
    failed_operations_count: int
    timestamp: datetime

class HealthCheckResponse(BaseModel):
    status: str
    app_name: str
    version: str
    database_connected: bool
    timestamp: datetime
