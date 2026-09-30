import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.api_router import api_router
from app.services.auth_service import ensure_initial_admin
from app.services.audit_service import record_audit_log
from app.workers.job_manager import job_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sani_forensic")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database and seed Admin
    logger.info("Initializing SANI-FORENSIC Database Schema...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        admin_user = ensure_initial_admin(db)
        logger.info(f"System ready. Default Administrator: {admin_user.username}")
        # Record startup in audit log
        record_audit_log(
            db=db,
            action="SYSTEM_STARTUP",
            user=admin_user,
            target_type="SYSTEM",
            target_identifier="BACKEND_API",
            result="SUCCESS",
            details=f"SANI-FORENSIC v{settings.VERSION} backend started in {settings.ENVIRONMENT} environment."
        )
    finally:
        db.close()

    yield

    # Shutdown
    logger.info("SANI-FORENSIC Backend shutting down...")
    db = SessionLocal()
    try:
        record_audit_log(
            db=db,
            action="SYSTEM_SHUTDOWN",
            target_type="SYSTEM",
            target_identifier="BACKEND_API",
            result="SUCCESS",
            details="Backend API shutdown sequence completed."
        )
    finally:
        db.close()

app = FastAPI(
    title="SANI-FORENSIC API",
    description="Full-Stack Digital Forensics & Secure Data Sanitization Platform REST API",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router)

# WebSocket Endpoints for Real-Time Telemetry & Progress
@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_endpoint(websocket: WebSocket, job_id: str):
    await job_manager.connect(websocket, job_id=job_id)
    try:
        while True:
            # Keep-alive ping/pong or client cancellation message
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        job_manager.disconnect(websocket, job_id=job_id)

@app.websocket("/ws/system")
async def websocket_system_endpoint(websocket: WebSocket):
    await job_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        job_manager.disconnect(websocket)

@app.get("/")
def root_status():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "docs": "/docs"
    }
