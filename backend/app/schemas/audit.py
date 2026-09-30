from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class AuditLogCreate(BaseModel):
    action: str
    target_type: Optional[str] = None
    target_identifier: Optional[str] = None
    operation_id: Optional[str] = None
    result: Optional[str] = "SUCCESS"
    details: Optional[str] = None

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_identifier: Optional[str] = None
    operation_id: Optional[str] = None
    ip_address: Optional[str] = None
    result: str
    details: Optional[str] = None
    record_hash: str
    prev_hash: Optional[str] = None

class AuditLogFilter(BaseModel):
    action: Optional[str] = None
    username: Optional[str] = None
    target_type: Optional[str] = None
    result: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 100
    offset: int = 0
