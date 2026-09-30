from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class RecoveryStartRequest(BaseModel):
    source_path: str
    source_type: str = "IMAGE" # IMAGE, FILE, DEVICE, FOLDER
    scan_method: str = "SIGNATURE_CARVING"
    target_categories: Optional[List[str]] = None
    case_id: Optional[int] = None

class RecoveredFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    case_id: Optional[int] = None
    original_filename: str
    relative_path: str
    file_type: str
    category: str
    offset: int
    size: int
    signature_matched: Optional[str] = None
    confidence_score: float
    confidence_level: str
    sha256_hash: Optional[str] = None
    validation_status: str
    is_exported: bool
    recovery_timestamp: Optional[datetime] = None

class RecoveryJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: Optional[int] = None
    source_type: str
    source_path: str
    source_hash: Optional[str] = None
    scan_method: str
    target_file_types: Optional[str] = None
    status: str
    progress: float
    total_bytes: int
    processed_bytes: int
    files_found: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    operator_id: Optional[int] = None
    error_message: Optional[str] = None

class RecoveryJobDetailResponse(BaseModel):
    job: RecoveryJobResponse
    files: List[RecoveredFileResponse]

class FilePreviewResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    category: str
    size: int
    sha256: Optional[str] = None
    preview_type: str # IMAGE, TEXT, HEX
    content: str # base64 string, text snippet, or hex dump table
    truncated: bool = False

class RecoveryExportRequest(BaseModel):
    file_ids: List[int]
    destination_folder: str
