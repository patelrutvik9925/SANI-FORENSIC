import hashlib
import json
import csv
import io
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.entities import AuditLog, User
from app.schemas.audit import AuditLogCreate

def calculate_log_hash(
    timestamp: datetime,
    user_id: Optional[int],
    username: Optional[str],
    action: str,
    target_type: Optional[str],
    target_identifier: Optional[str],
    result: str,
    details: Optional[str],
    prev_hash: Optional[str]
) -> str:
    """Calculate SHA-256 hash of audit log entry, chaining to the previous entry."""
    payload = (
        f"{timestamp.isoformat()}|{user_id}|{username}|{action}|"
        f"{target_type}|{target_identifier}|{result}|{details}|{prev_hash or 'GENESIS'}"
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def record_audit_log(
    db: Session,
    action: str,
    user: Optional[User] = None,
    target_type: Optional[str] = None,
    target_identifier: Optional[str] = None,
    operation_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    result: str = "SUCCESS",
    details: Optional[str] = None
) -> AuditLog:
    """Create a new tamper-evident audit log record with hash chaining."""
    # Find the most recent audit log to get previous hash
    last_log = db.query(AuditLog).order_by(desc(AuditLog.id)).first()
    prev_hash = last_log.record_hash if last_log else "GENESIS_HASH_SANI_FORENSIC"

    now = datetime.utcnow()
    user_id = user.id if user else None
    username = user.username if user else "SYSTEM"
    role = user.role if user else "SYSTEM"

    record_hash = calculate_log_hash(
        timestamp=now,
        user_id=user_id,
        username=username,
        action=action,
        target_type=target_type,
        target_identifier=target_identifier,
        result=result,
        details=details,
        prev_hash=prev_hash
    )

    log_entry = AuditLog(
        timestamp=now,
        user_id=user_id,
        username=username,
        role=role,
        action=action,
        target_type=target_type,
        target_identifier=target_identifier,
        operation_id=operation_id,
        ip_address=ip_address,
        result=result,
        details=details,
        record_hash=record_hash,
        prev_hash=prev_hash
    )

    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def verify_audit_trail_integrity(db: Session) -> Dict[str, Any]:
    """Verify the cryptographic chain of all audit log records from genesis."""
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    if not logs:
        return {
            "status": "VALID",
            "total_records": 0,
            "broken_at_id": None,
            "message": "Audit log is empty."
        }

    prev_hash = "GENESIS_HASH_SANI_FORENSIC"
    for log in logs:
        if log.prev_hash != prev_hash:
            return {
                "status": "COMPROMISED",
                "total_records": len(logs),
                "broken_at_id": log.id,
                "message": f"Hash chain broken at record ID {log.id}: previous hash mismatch."
            }

        expected_hash = calculate_log_hash(
            timestamp=log.timestamp,
            user_id=log.user_id,
            username=log.username,
            action=log.action,
            target_type=log.target_type,
            target_identifier=log.target_identifier,
            result=log.result,
            details=log.details,
            prev_hash=prev_hash
        )

        if log.record_hash != expected_hash:
            return {
                "status": "COMPROMISED",
                "total_records": len(logs),
                "broken_at_id": log.id,
                "message": f"Tampering detected at record ID {log.id}: computed hash does not match stored hash."
            }

        prev_hash = log.record_hash

    return {
        "status": "VALID",
        "total_records": len(logs),
        "broken_at_id": None,
        "latest_hash": prev_hash,
        "message": "Audit log cryptographic chain verified successfully."
    }

def export_audit_logs_csv(logs: List[AuditLog]) -> str:
    """Export audit records into a standard CSV string."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Timestamp (UTC)", "User", "Role", "Action", "Target Type",
        "Target Identifier", "Operation ID", "Result", "Details", "Record Hash"
    ])
    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.isoformat(),
            log.username or "SYSTEM",
            log.role or "SYSTEM",
            log.action,
            log.target_type or "",
            log.target_identifier or "",
            log.operation_id or "",
            log.result,
            log.details or "",
            log.record_hash
        ])
    return output.getvalue()
