from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from app.database import get_db
from app.config import settings
from app.schemas.system import SystemStatusResponse, HealthCheckResponse
from app.services.system_service import get_system_status

router = APIRouter(prefix="/system", tags=["System Telemetry & Health"])

@router.get("/status", response_model=SystemStatusResponse, summary="Retrieve live OS, hardware, and system telemetry")
def read_system_status(db: Session = Depends(get_db)):
    """Return real-time hardware telemetry, live disk partitions, Windows administrator status, and operation counts."""
    return get_system_status(db)

@router.get("/health", response_model=HealthCheckResponse, summary="System health check endpoint")
def health_check(db: Session = Depends(get_db)):
    """Verify backend and database connectivity."""
    db_connected = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_connected = False

    return HealthCheckResponse(
        status="HEALTHY" if db_connected else "DEGRADED",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        database_connected=db_connected,
        timestamp=datetime.utcnow()
    )
