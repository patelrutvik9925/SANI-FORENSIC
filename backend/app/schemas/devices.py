from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class PartitionDetail(BaseModel):
    partition_number: int
    size: int
    type: Optional[str] = None
    drive_letter: Optional[str] = None
    is_system: bool = False
    is_boot: bool = False
    volume_label: Optional[str] = None
    filesystem: Optional[str] = None

class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    name: str
    model: Optional[str] = None
    serial: Optional[str] = None
    vendor: Optional[str] = None
    media_type: Optional[str] = None
    bus_type: Optional[str] = None
    capacity: int
    used_space: int
    free_space: int
    filesystem: Optional[str] = None
    mount_point: Optional[str] = None
    is_removable: bool
    is_readonly: bool
    is_system: bool
    operational_status: str
    last_detected_at: datetime

class DeviceDetailResponse(DeviceResponse):
    partitions: List[PartitionDetail] = []
    sanitization_allowed: bool
    sanitization_block_reason: Optional[str] = None

class DeviceScanResponse(BaseModel):
    scan_id: int
    device_id: str
    status: str
    scan_type: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    detected_partitions_count: int
    details: Optional[str] = None
