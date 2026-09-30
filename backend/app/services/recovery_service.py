import os
import shutil
import base64
import logging
import json
import csv
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import SessionLocal
from app.models.entities import RecoveryJob, RecoveredFile, JobStatus, ConfidenceLevel, User
from app.services.audit_service import record_audit_log
from app.forensic.carver import carve_evidence_file
from app.schemas.recovery import RecoveryStartRequest, RecoveryExportRequest

logger = logging.getLogger("sani_forensic.services.recovery")
settings = Settings()

def generate_hex_dump(data: bytes, max_bytes: int = 4096) -> str:
    """Generate professional forensic hex dump with byte offsets and ASCII column."""
    lines = []
    chunk = data[:max_bytes]
    for i in range(0, len(chunk), 16):
        line_bytes = chunk[i:i+16]
        hex_str = " ".join(f"{b:02X}" for b in line_bytes)
        # Pad hex string if fewer than 16 bytes
        if len(line_bytes) < 16:
            hex_str = hex_str.ljust(16 * 3 - 1)
        ascii_str = "".join(chr(b) if 32 <= b <= 126 else "." for b in line_bytes)
        lines.append(f"{i:08X}  {hex_str[:23]}  {hex_str[24:]}  |{ascii_str}|")
    return "\n".join(lines)

def execute_recovery_worker(job_id: int, source_path: str, target_categories: Optional[List[str]] = None):
    """Background task executing read-only forensic carving."""
    db: Session = SessionLocal()
    job = db.query(RecoveryJob).filter(RecoveryJob.id == job_id).first()
    if not job:
        db.close()
        return

    job_output_dir = os.path.join(settings.RECOVERY_DIRECTORY, f"job_{job_id}")
    os.makedirs(job_output_dir, exist_ok=True)

    try:
        job.status = JobStatus.RUNNING.value
        job.started_at = datetime.utcnow()
        db.commit()

        last_update_pct = 0.0

        def progress_cb(pct: float, current_offset: int, total_size: int, found_count: int):
            nonlocal last_update_pct
            # Update DB periodically (every 5% or 100%)
            if pct - last_update_pct >= 5.0 or pct >= 100.0:
                last_update_pct = pct
                try:
                    job.progress = round(pct, 2)
                    job.processed_bytes = current_offset
                    job.files_found = found_count
                    db.commit()
                except Exception as e:
                    logger.warning(f"Error updating recovery progress: {e}")

        # Run read-only carving
        result = carve_evidence_file(
            source_path=source_path,
            output_dir=job_output_dir,
            target_categories=target_categories,
            progress_callback=progress_cb
        )

        job.source_hash = result["source_sha256"]
        job.processed_bytes = result["source_size"]
        job.total_bytes = result["source_size"]
        job.files_found = len(result["files_carved"])
        job.status = JobStatus.COMPLETED.value
        job.progress = 100.0
        job.completed_at = datetime.utcnow()

        # Insert RecoveredFile records
        for item in result["files_carved"]:
            rec_file = RecoveredFile(
                job_id=job.id,
                case_id=job.case_id,
                original_filename=item["filename"],
                relative_path=item["file_path"],
                file_type=item["file_type"],
                category=item["category"],
                offset=item["offset"],
                size=item["size"],
                signature_matched=item["signature_matched"],
                confidence_score=item["confidence_score"],
                confidence_level=item["confidence_level"],
                sha256_hash=item["sha256_hash"],
                validation_status=item["validation_status"],
                is_exported=False,
                recovery_timestamp=datetime.utcnow()
            )
            db.add(rec_file)

        db.commit()

        record_audit_log(
            db=db,
            action="RECOVERY_JOB_COMPLETED",
            target_type="FILE",
            target_identifier=source_path,
            operation_id=str(job_id),
            result="SUCCESS",
            details=f"Completed forensic carving on {source_path}. Carved {len(result['files_carved'])} intact files. Source SHA-256: {result['source_sha256']}."
        )

    except Exception as e:
        logger.exception(f"Forensic recovery failed for job {job_id}: {e}")
        try:
            job.status = JobStatus.FAILED.value
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.commit()

            record_audit_log(
                db=db,
                action="RECOVERY_JOB_FAILED",
                target_type="FILE",
                target_identifier=source_path,
                operation_id=str(job_id),
                result="FAILURE",
                details=f"Recovery failed with error: {str(e)}"
            )
        except Exception:
            pass
    finally:
        db.close()

def start_recovery_job(db: Session, req: RecoveryStartRequest, user_id: int) -> RecoveryJob:
    """Initiate a forensic file carving job."""
    if not os.path.exists(req.source_path):
        raise FileNotFoundError(f"Source evidence does not exist: {req.source_path}")

    source_size = os.path.getsize(req.source_path)

    job = RecoveryJob(
        case_id=req.case_id,
        source_type=req.source_type,
        source_path=req.source_path,
        scan_method=req.scan_method,
        target_file_types=",".join(req.target_categories) if req.target_categories else "ALL",
        status=JobStatus.QUEUED.value,
        progress=0.0,
        total_bytes=source_size,
        processed_bytes=0,
        files_found=0,
        operator_id=user_id,
        started_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    record_audit_log(
        db=db,
        action="RECOVERY_JOB_QUEUED",
        target_type="FILE",
        target_identifier=req.source_path,
        operation_id=str(job.id),
        user=user,
        result="SUCCESS",
        details=f"Queued forensic recovery on {req.source_path} ({source_size} bytes). Method: {req.scan_method}."
    )

    return job

def get_recovery_job(db: Session, job_id: int) -> Optional[RecoveryJob]:
    return db.query(RecoveryJob).filter(RecoveryJob.id == job_id).first()

def list_recovery_jobs(db: Session, limit: int = 50) -> List[RecoveryJob]:
    return db.query(RecoveryJob).order_by(RecoveryJob.id.desc()).limit(limit).all()

def get_recovered_files(
    db: Session,
    job_id: int,
    category: Optional[str] = None,
    confidence_level: Optional[str] = None
) -> List[RecoveredFile]:
    query = db.query(RecoveredFile).filter(RecoveredFile.job_id == job_id)
    if category and category.upper() != "ALL":
        query = query.filter(RecoveredFile.category == category.upper())
    if confidence_level and confidence_level.upper() != "ALL":
        query = query.filter(RecoveredFile.confidence_level == confidence_level.upper())
    return query.order_by(RecoveredFile.offset.asc()).all()

def get_file_preview_data(db: Session, file_id: int) -> Dict[str, Any]:
    """Retrieve safe read-only preview content for a carved file without executing it."""
    rec_file = db.query(RecoveredFile).filter(RecoveredFile.id == file_id).first()
    if not rec_file:
        raise FileNotFoundError("Recovered file record not found")

    path = rec_file.relative_path
    if not os.path.exists(path):
        raise FileNotFoundError(f"Carved file artifact missing on disk: {path}")

    file_size = os.path.getsize(path)
    file_type = rec_file.file_type.upper()

    # Handle image formats
    if file_type in ["JPG", "JPEG", "PNG", "WEBP", "GIF"] and file_size <= 10 * 1024 * 1024:
        with open(path, "rb") as f:
            raw = f.read()
        b64 = base64.b64encode(raw).decode("utf-8")
        mime = "jpeg" if file_type in ["JPG", "JPEG"] else file_type.lower()
        return {
            "id": rec_file.id,
            "filename": rec_file.original_filename,
            "file_type": rec_file.file_type,
            "category": rec_file.category,
            "size": file_size,
            "sha256": rec_file.sha256_hash,
            "preview_type": "IMAGE",
            "content": f"data:image/{mime};base64,{b64}",
            "truncated": False
        }

    # Handle text or binary
    with open(path, "rb") as f:
        head_bytes = f.read(64 * 1024)

    try:
        text_content = head_bytes.decode("utf-8")
        # Check if reasonably printable text
        printable = sum(1 for c in text_content if c.isprintable() or c in "\r\n\t")
        if len(text_content) > 0 and (printable / len(text_content)) > 0.85:
            return {
                "id": rec_file.id,
                "filename": rec_file.original_filename,
                "file_type": rec_file.file_type,
                "category": rec_file.category,
                "size": file_size,
                "sha256": rec_file.sha256_hash,
                "preview_type": "TEXT",
                "content": text_content[:8192],
                "truncated": file_size > 8192
            }
    except UnicodeDecodeError:
        pass

    # Fallback to forensic hex dump
    hex_dump = generate_hex_dump(head_bytes, max_bytes=2048)
    return {
        "id": rec_file.id,
        "filename": rec_file.original_filename,
        "file_type": rec_file.file_type,
        "category": rec_file.category,
        "size": file_size,
        "sha256": rec_file.sha256_hash,
        "preview_type": "HEX",
        "content": hex_dump,
        "truncated": file_size > 2048
    }

def export_recovered_files(db: Session, req: RecoveryExportRequest, user_id: int) -> Dict[str, Any]:
    """Export selected recovered files to destination folder with verification manifest."""
    os.makedirs(req.destination_folder, exist_ok=True)

    files = db.query(RecoveredFile).filter(RecoveredFile.id.in_(req.file_ids)).all()
    if not files:
        raise ValueError("No matching recovered files found to export")

    exported_items = []
    manifest_rows = []

    for item in files:
        if os.path.exists(item.relative_path):
            dest_name = item.original_filename
            dest_path = os.path.join(req.destination_folder, dest_name)
            shutil.copy2(item.relative_path, dest_path)
            item.is_exported = True
            exported_items.append({
                "id": item.id,
                "filename": item.original_filename,
                "dest_path": dest_path,
                "sha256": item.sha256_hash,
                "size": item.size
            })
            manifest_rows.append({
                "id": item.id,
                "filename": item.original_filename,
                "category": item.category,
                "file_type": item.file_type,
                "offset": item.offset,
                "size": item.size,
                "confidence_level": item.confidence_level,
                "confidence_score": item.confidence_score,
                "sha256_hash": item.sha256_hash,
                "exported_at": datetime.utcnow().isoformat()
            })

    db.commit()

    # Write JSON manifest
    manifest_json_path = os.path.join(req.destination_folder, "recovery_manifest.json")
    with open(manifest_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "exported_at": datetime.utcnow().isoformat(),
            "operator_id": user_id,
            "total_files": len(exported_items),
            "files": manifest_rows
        }, f, indent=2)

    # Write CSV manifest
    manifest_csv_path = os.path.join(req.destination_folder, "recovery_manifest.csv")
    if manifest_rows:
        with open(manifest_csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(manifest_rows[0].keys()))
            writer.writeheader()
            writer.writerows(manifest_rows)

    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    record_audit_log(
        db=db,
        action="RECOVERY_FILES_EXPORTED",
        target_type="FOLDER",
        target_identifier=req.destination_folder,
        user=user,
        result="SUCCESS",
        details=f"Exported {len(exported_items)} recovered files to {req.destination_folder} with forensic manifest."
    )

    return {
        "destination_folder": req.destination_folder,
        "total_exported": len(exported_items),
        "manifest_json": manifest_json_path,
        "manifest_csv": manifest_csv_path,
        "exported_files": exported_items
    }
