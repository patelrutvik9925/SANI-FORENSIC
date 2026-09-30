from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.system import router as system_router
from app.api.audit import router as audit_router
from app.api.devices import router as devices_router
from app.api.sanitization import router as sanitization_router
from app.api.recovery import router as recovery_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(system_router)
api_router.include_router(audit_router)
api_router.include_router(devices_router)
api_router.include_router(sanitization_router)
api_router.include_router(recovery_router)

