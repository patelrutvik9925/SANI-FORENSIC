from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.entities import AuditLog, User
from app.schemas.audit import AuditLogResponse
from app.services.auth_service import get_current_user
from app.services.audit_service import verify_audit_trail_integrity, export_audit_logs_csv

router = APIRouter(prefix="/audit", tags=["Audit Logging & Chain-of-Custody"])

@router.get("", response_model=List[AuditLogResponse], summary="Query immutable audit log records")
def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    username: Optional[str] = Query(None, description="Filter by username"),
    result: Optional[str] = Query(None, description="Filter by result (SUCCESS/DENIED/FAILED)"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve audit logs with optional filters. All events are cryptographically hashed."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if username:
        query = query.filter(AuditLog.username == username)
    if result:
        query = query.filter(AuditLog.result == result)

    logs = query.order_by(desc(AuditLog.id)).offset(offset).limit(limit).all()
    return logs

@router.get("/verify", summary="Verify SHA-256 cryptographic chain of all audit records")
def verify_audit_trail(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verifies that no audit records have been inserted, modified, or deleted out of sequence."""
    return verify_audit_trail_integrity(db)

@router.get("/export", summary="Export audit log records to CSV format")
def export_audit_logs(
    format: str = Query("csv", pattern="^(csv|json)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export complete audit trail for compliance and external forensic auditing."""
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    if format == "csv":
        csv_data = export_audit_logs_csv(logs)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=sani_forensic_audit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
    else:
        # JSON export
        log_dicts = [
            {
                "id": l.id,
                "timestamp": l.timestamp.isoformat(),
                "username": l.username,
                "role": l.role,
                "action": l.action,
                "target_type": l.target_type,
                "target_identifier": l.target_identifier,
                "operation_id": l.operation_id,
                "result": l.result,
                "details": l.details,
                "record_hash": l.record_hash,
                "prev_hash": l.prev_hash
            }
            for l in logs
        ]
        return log_dicts
