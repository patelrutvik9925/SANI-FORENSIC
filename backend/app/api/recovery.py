import os
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.entities import User
from app.schemas.recovery import (
    RecoveryStartRequest, RecoveryJobResponse, RecoveredFileResponse,
    RecoveryJobDetailResponse, FilePreviewResponse, RecoveryExportRequest
)
from app.services.auth_service import get_current_user
from app.services.recovery_service import (
    start_recovery_job, execute_recovery_worker, get_recovery_job,
    list_recovery_jobs, get_recovered_files, get_file_preview_data,
    export_recovered_files
)

router = APIRouter(prefix="/recovery", tags=["Forensic Recovery & File Carving"])

@router.post("/start", response_model=RecoveryJobResponse, summary="Start forensic signature carving scan")
def initiate_recovery(
    req: RecoveryStartRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Launch a strictly read-only forensic file carving scan against an image, raw partition, or directory.
    Validates source accessibility, calculates source SHA-256 pre-scan hash, and dispatches background worker.
    """
    try:
        job = start_recovery_job(db, req, user_id=current_user.id)
        background_tasks.add_task(
            execute_recovery_worker,
            job_id=job.id,
            source_path=job.source_path,
            target_categories=req.target_categories
        )
        return job
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/jobs", response_model=List[RecoveryJobResponse], summary="List all forensic recovery jobs")
def get_jobs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve history of all forensic recovery and carving jobs with their statuses and metrics."""
    return list_recovery_jobs(db, limit=limit)

@router.get("/jobs/{job_id}", response_model=RecoveryJobResponse, summary="Get forensic recovery job status")
def get_job_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check live status, sector progress, and files found count for a specific recovery job."""
    job = get_recovery_job(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recovery job {job_id} not found")
    return job

@router.get("/jobs/{job_id}/results", response_model=List[RecoveredFileResponse], summary="List carved artifacts for job")
def get_job_results(
    job_id: int,
    category: Optional[str] = Query(None, description="Filter by file category (IMAGE, DOCUMENT, etc.)"),
    confidence: Optional[str] = Query(None, description="Filter by confidence level (HIGH, MEDIUM, LOW)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch carved files discovered during the forensic job, with confidence scores and hashes."""
    job = get_recovery_job(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recovery job {job_id} not found")
    return get_recovered_files(db, job_id, category=category, confidence_level=confidence)

@router.get("/jobs/{job_id}/details", response_model=RecoveryJobDetailResponse, summary="Get comprehensive job details and results")
def get_job_details(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return job metadata combined with all recovered file entries."""
    job = get_recovery_job(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recovery job {job_id} not found")
    files = get_recovered_files(db, job_id)
    return RecoveryJobDetailResponse(job=job, files=files)

@router.get("/file/{file_id}/preview", response_model=FilePreviewResponse, summary="Safe sandboxed preview of carved file")
def preview_carved_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate safe read-only preview of a carved file without risk of code execution.
    Renders base64 image data for pictures, text snippet for documents, or hexadecimal dump for binaries.
    """
    try:
        return get_file_preview_data(db, file_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/export", summary="Export selected recovered artifacts to destination folder")
def export_files(
    req: RecoveryExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Copy selected carved artifacts into an investigator-specified destination folder
    and generate verification manifests (JSON and CSV) containing cryptographic hashes.
    """
    try:
        return export_recovered_files(db, req, user_id=current_user.id)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
