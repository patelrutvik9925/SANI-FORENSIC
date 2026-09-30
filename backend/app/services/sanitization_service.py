import os
import shutil
import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.entities import SanitizationJob, SanitizationVerification, JobStatus, User, Device
from app.services.audit_service import record_audit_log
from app.services.system_service import check_admin_privileges
from app.sanitization.algorithms import wipe_file_passes, SANITIZATION_METHODS, calculate_file_sha256
from app.workers.job_manager import job_manager

logger = logging.getLogger("sani_forensic.services.sanitization")

def execute_file_sanitization_worker(
    job_id: int,
    file_path: str,
    method: str
):
    """Worker for secure multi-pass file overwrite and deletion."""
    db: Session = SessionLocal()
    job = db.query(SanitizationJob).filter(SanitizationJob.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        job.status = JobStatus.RUNNING.value
        job.started_at = datetime.utcnow()
        db.commit()

        def progress_cb(pct: float, bytes_done: int, total: int):
            try:
                # Update DB progress occasionally
                job.progress = pct
                job.bytes_processed = bytes_done
                db.commit()
            except Exception:
                pass

        # Execute wipe
        res = wipe_file_passes(file_path, method, progress_cb)

        job.status = JobStatus.COMPLETED.value
        job.progress = 100.0
        job.bytes_processed = res["bytes_processed"]
        job.total_bytes = res["bytes_processed"]
        job.pre_sanitization_hash = res["pre_hash"]
        job.completed_at = datetime.utcnow()
        db.commit()

        # Audit event
        record_audit_log(
            db=db,
            action="FILE_SANITIZATION_COMPLETED",
            target_type="FILE",
            target_identifier=file_path,
            operation_id=str(job_id),
            result="SUCCESS",
            details=f"Securely deleted {file_path} using {method} ({res['passes']} passes). Initial SHA-256: {res['pre_hash']}."
        )
    except Exception as e:
        logger.exception("File sanitization failed")
        job.status = JobStatus.FAILED.value
        job.error_message = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()

        record_audit_log(
            db=db,
            action="FILE_SANITIZATION_FAILED",
            target_type="FILE",
            target_identifier=file_path,
            operation_id=str(job_id),
            result="FAILED",
            details=f"Sanitization failed: {str(e)}"
        )
    finally:
        db.close()

def execute_folder_sanitization_worker(
    job_id: int,
    folder_path: str,
    method: str
):
    """Worker for recursive secure folder deletion."""
    db: Session = SessionLocal()
    job = db.query(SanitizationJob).filter(SanitizationJob.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        job.status = JobStatus.RUNNING.value
        job.started_at = datetime.utcnow()
        db.commit()

        # Collect all files
        all_files = []
        for root, dirs, files in os.walk(folder_path):
            for f in files:
                all_files.append(os.path.join(root, f))

        total_files = len(all_files)
        total_size = sum(os.path.getsize(f) for f in all_files if os.path.isfile(f))
        job.total_bytes = total_size
        db.commit()

        files_wiped = 0
        bytes_wiped = 0

        for file_p in all_files:
            if os.path.isfile(file_p):
                file_sz = os.path.getsize(file_p)
                wipe_file_passes(file_p, method=method)
                bytes_wiped += file_sz
                files_wiped += 1

                progress_pct = (files_wiped / max(1, total_files)) * 100.0
                job.progress = progress_pct
                job.bytes_processed = bytes_wiped
                db.commit()

        # Remove now-empty directory tree
        shutil.rmtree(folder_path, ignore_errors=True)

        job.status = JobStatus.COMPLETED.value
        job.progress = 100.0
        job.completed_at = datetime.utcnow()
        db.commit()

        record_audit_log(
            db=db,
            action="FOLDER_SANITIZATION_COMPLETED",
            target_type="FOLDER",
            target_identifier=folder_path,
            operation_id=str(job_id),
            result="SUCCESS",
            details=f"Securely erased folder {folder_path} ({total_files} files, {bytes_wiped} bytes) using {method}."
        )
    except Exception as e:
        logger.exception("Folder sanitization failed")
        job.status = JobStatus.FAILED.value
        job.error_message = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()

        record_audit_log(
            db=db,
            action="FOLDER_SANITIZATION_FAILED",
            target_type="FOLDER",
            target_identifier=folder_path,
            operation_id=str(job_id),
            result="FAILED",
            details=f"Folder sanitization error: {str(e)}"
        )
    finally:
        db.close()
