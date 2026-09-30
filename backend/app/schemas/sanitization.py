from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class DriveSanitizeRequest(BaseModel):
    device_id: str
    method: str = "NIST_800_88_CLEAR"
    confirmation_phrase: str # Must match "ERASE <device_id>"

class FileSanitizeRequest(BaseModel):
    file_path: str
    method: str = "NIST_800_88_CLEAR"
    confirmation_phrase: str # Must match "ERASE <filename>"

class FolderSanitizeRequest(BaseModel):
    folder_path: str
    method: str = "NIST_800_88_CLEAR"
    confirmation_phrase: str # Must match "ERASE <foldername>"

class SanitizationJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_type: str
    target_path: str
    target_device_id: Optional[str] = None
    method: str
    passes: int
    status: str
    progress: float
    bytes_processed: int
    total_bytes: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    operator_id: Optional[int] = None
    error_message: Optional[str] = None
    pre_sanitization_hash: Optional[str] = None
    post_sanitization_hash: Optional[str] = None

class FileBrowseItem(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: Optional[int] = 0
    extension: Optional[str] = None
    created_at: Optional[str] = None
    modified_at: Optional[str] = None
    accessed_at: Optional[str] = None
    sha256: Optional[str] = None

class DirectoryBrowseResponse(BaseModel):
    current_path: str
    parent_path: Optional[str] = None
    items: List[FileBrowseItem]

class FolderSummaryResponse(BaseModel):
    folder_path: str
    total_files: int
    total_directories: int
    total_size: int
