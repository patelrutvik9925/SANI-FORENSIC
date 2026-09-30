import os
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.database import get_db
from app.models.entities import SanitizationJob, Device, User, JobStatus
from app.schemas.sanitization import (
    DriveSanitizeRequest, FileSanitizeRequest, FolderSanitizeRequest,
    SanitizationJobResponse, DirectoryBrowseResponse, FolderSummaryResponse
)
from app.services.auth_service import get_current_user
from app.services.audit_service import record_audit_log
from app.services.system_service import check_admin_privileges
from app.services.file_browser_service import list_directory_contents, calculate_folder_summary
from app.services.sanitization_service import (
    execute_file_sanitization_worker, execute_folder_sanitization_worker
)
from app.sanitization.algorithms import SANITIZATION_METHODS

router = APIRouter(prefix="/sanitization", tags=["Data Sanitization & Secure Erasure"])

@router.get("/methods", summary="List documented data sanitization methods and standards")
def get_sanitization_methods():
    """Return recognized sanitization standards (NIST SP 800-88 Rev. 1, DoD 5220.22-M) and technical media suitability."""
    return SANITIZATION_METHODS

@router.get("/browse", response_model=DirectoryBrowseResponse, summary="Browse real local filesystem directories")
def browse_filesystem(
    path: Optional[str] = Query(None, description="Directory path to inspect"),
    current_user: User = Depends(get_current_user)
):
    """Retrieve real filesystem directory listing with file sizes, timestamps, and SHA-256 hashes."""
    try:
        data = list_directory_contents(path)
        return data
    except (FileNotFoundError, NotADirectoryError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

@router.post("/folder-summary", response_model=FolderSummaryResponse, summary="Recursively summarize folder for pre-deletion review")
def get_folder_summary(
    folder_path: str = Query(..., description="Target directory path"),
    current_user: User = Depends(get_current_user)
):
    """Recursively calculate total files, directories, and byte size of a target folder before sanitization."""
    try:
        return calculate_folder_summary(folder_path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/file", response_model=SanitizationJobResponse, summary="Start secure file sanitization job")
def sanitize_file(
    req: FileSanitizeRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform multi-pass physical overwrite, metadata obscuration, and unlinking of a single file."""
    client_ip = request.client.host if request.client else "unknown"
    target_path = os.path.abspath(req.file_path)

    if not os.path.isfile(target_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File not found: {req.file_path}")

    filename = os.path.basename(target_path)
    expected_phrase = f"ERASE {filename}"
    if req.confirmation_phrase.strip() != expected_phrase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Confirmation phrase mismatch. You must type exactly '{expected_phrase}'."
        )

    method_info = SANITIZATION_METHODS.get(req.method, SANITIZATION_METHODS["NIST_800_88_CLEAR"])

    # Create job record
    job = SanitizationJob(
        job_type="FILE",
        target_path=target_path,
        method=req.method,
        passes=method_info["passes"],
        status=JobStatus.QUEUED.value,
        progress=0.0,
        bytes_processed=0,
        total_bytes=os.path.getsize(target_path) * method_info["passes"],
        operator_id=current_user.id,
        confirmation_code=req.confirmation_phrase,
        started_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    record_audit_log(
        db=db,
        action="FILE_SANITIZATION_INITIATED",
        user=current_user,
        target_type="FILE",
        target_identifier=target_path,
        operation_id=str(job.id),
        ip_address=client_ip,
        result="SUCCESS",
        details=f"File sanitization initiated using {method_info['name']} ({method_info['passes']} passes)."
    )

    # Launch background worker safely via BackgroundTasks
    background_tasks.add_task(
        execute_file_sanitization_worker,
        job_id=job.id,
        file_path=target_path,
        method=req.method
    )

    return job

@router.post("/folder", response_model=SanitizationJobResponse, summary="Start recursive secure folder sanitization job")
def sanitize_folder(
    req: FolderSanitizeRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recursively overwrite every file in a directory and remove directory indices."""
    client_ip = request.client.host if request.client else "unknown"
    target_path = os.path.abspath(req.folder_path)

    if not os.path.isdir(target_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Directory not found: {req.folder_path}")

    # Safety check: prevent deleting drive root directly
    if target_path == os.path.dirname(target_path):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot erase root directory of a drive.")

    folder_name = os.path.basename(target_path)
    expected_phrase = f"ERASE {folder_name}"
    if req.confirmation_phrase.strip() != expected_phrase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Confirmation phrase mismatch. You must type exactly '{expected_phrase}'."
        )

    method_info = SANITIZATION_METHODS.get(req.method, SANITIZATION_METHODS["NIST_800_88_CLEAR"])

    job = SanitizationJob(
        job_type="FOLDER",
        target_path=target_path,
        method=req.method,
        passes=method_info["passes"],
        status=JobStatus.QUEUED.value,
        progress=0.0,
        bytes_processed=0,
        total_bytes=0,
        operator_id=current_user.id,
        confirmation_code=req.confirmation_phrase,
        started_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    record_audit_log(
        db=db,
        action="FOLDER_SANITIZATION_INITIATED",
        user=current_user,
        target_type="FOLDER",
        target_identifier=target_path,
        operation_id=str(job.id),
        ip_address=client_ip,
        result="SUCCESS",
        details=f"Folder sanitization initiated for {target_path} using {method_info['name']}."
    )

    background_tasks.add_task(
        execute_folder_sanitization_worker,
        job_id=job.id,
        folder_path=target_path,
        method=req.method
    )

    return job

@router.post("/drive", response_model=SanitizationJobResponse, summary="Start physical storage drive sanitization job")
def sanitize_drive(
    req: DriveSanitizeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enforce strict hardware safety controls before authorizing physical drive erasure."""
    client_ip = request.client.host if request.client else "unknown"

    # 1. Lookup Device
    device = db.query(Device).filter(Device.device_id == req.device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Device {req.device_id} not found in inventory.")

    # 2. Strict Safety Barrier: Prevent wiping system or boot drive
    if device.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"BLOCKED: {device.device_id} is marked as the System/Boot drive. Direct sanitization is prohibited to prevent OS destruction."
        )

    # 3. Privilege Check
    if not check_admin_privileges():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required for low-level physical drive sanitization."
        )

    # 4. Confirmation Phrase Validation
    expected_phrase = f"ERASE {device.device_id}"
    if req.confirmation_phrase.strip() != expected_phrase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Confirmation phrase mismatch. You must type exactly '{expected_phrase}'."
        )

    method_info = SANITIZATION_METHODS.get(req.method, SANITIZATION_METHODS["NIST_800_88_CLEAR"])

    job = SanitizationJob(
        job_type="DRIVE",
        target_path=device.device_id,
        target_device_id=device.device_id,
        method=req.method,
        passes=method_info["passes"],
        status=JobStatus.QUEUED.value,
        progress=0.0,
        bytes_processed=0,
        total_bytes=device.capacity,
        operator_id=current_user.id,
        confirmation_code=req.confirmation_phrase,
        started_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    record_audit_log(
        db=db,
        action="DRIVE_SANITIZATION_AUTHORIZED",
        user=current_user,
        target_type="DRIVE",
        target_identifier=device.device_id,
        operation_id=str(job.id),
        ip_address=client_ip,
        result="SUCCESS",
        details=f"Drive sanitization authorized for {device.name} ({device.device_id}) using {method_info['name']}."
    )

    return job

@router.get("/{job_id}", response_model=SanitizationJobResponse, summary="Query sanitization job progress")
def get_sanitization_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve real-time status, bytes processed, and execution logs for a sanitization job."""
    job = db.query(SanitizationJob).filter(SanitizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found.")
    return job
