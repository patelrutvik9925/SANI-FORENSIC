import os
import platform
import psutil
import ctypes
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.config import settings
from app.models.entities import SanitizationJob, RecoveryJob, Device, JobStatus
from app.schemas.system import SystemStatusResponse, DiskPartitionInfo

def check_admin_privileges() -> bool:
    """Check if the application process is running with elevated administrator privileges."""
    try:
        if platform.system() == "Windows":
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        else:
            return os.geteuid() == 0
    except Exception:
        return False

def get_disk_partitions_info() -> List[DiskPartitionInfo]:
    """Retrieve real mounted disk partitions and their current storage metrics."""
    partitions_info = []
    try:
        partitions = psutil.disk_partitions(all=False)
        for p in partitions:
            try:
                usage = psutil.disk_usage(p.mountpoint)
                partitions_info.append(DiskPartitionInfo(
                    device=p.device,
                    mountpoint=p.mountpoint,
                    fstype=p.fstype,
                    opts=p.opts,
                    total=usage.total,
                    used=usage.used,
                    free=usage.free,
                    percent=usage.percent
                ))
            except (PermissionError, OSError):
                # Unmounted, locked, or optical drive with no media
                continue
    except Exception:
        pass
    return partitions_info

def get_system_status(db: Session) -> SystemStatusResponse:
    """Collect real system telemetry, disk information, privilege level, and job statistics."""
    is_admin = check_admin_privileges()
    partitions = get_disk_partitions_info()

    # Workspace disk usage
    try:
        workspace_usage = psutil.disk_usage(settings.DATA_DIRECTORY)
        workspace_disk = {
            "path": settings.DATA_DIRECTORY,
            "total": workspace_usage.total,
            "used": workspace_usage.used,
            "free": workspace_usage.free,
            "percent": workspace_usage.percent
        }
    except Exception:
        workspace_disk = {"path": settings.DATA_DIRECTORY, "total": 0, "used": 0, "free": 0, "percent": 0.0}

    # Count real operations in DB
    active_sanitizations = db.query(SanitizationJob).filter(
        SanitizationJob.status.in_([JobStatus.RUNNING.value, JobStatus.QUEUED.value])
    ).count()
    active_recoveries = db.query(RecoveryJob).filter(
        RecoveryJob.status.in_([JobStatus.RUNNING.value, JobStatus.QUEUED.value])
    ).count()
    active_operations = active_sanitizations + active_recoveries

    completed_sanitizations = db.query(SanitizationJob).filter(
        SanitizationJob.status == JobStatus.COMPLETED.value
    ).count()
    completed_recoveries = db.query(RecoveryJob).filter(
        RecoveryJob.status == JobStatus.COMPLETED.value
    ).count()
    completed_operations = completed_sanitizations + completed_recoveries

    failed_sanitizations = db.query(SanitizationJob).filter(
        SanitizationJob.status == JobStatus.FAILED.value
    ).count()
    failed_recoveries = db.query(RecoveryJob).filter(
        RecoveryJob.status == JobStatus.FAILED.value
    ).count()
    failed_operations = failed_sanitizations + failed_recoveries

    # Count detected devices
    detected_devices_count = db.query(Device).count()

    # Memory telemetry
    vmem = psutil.virtual_memory()

    return SystemStatusResponse(
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        os_name=platform.system(),
        os_version=platform.version(),
        os_release=platform.release(),
        architecture=platform.machine(),
        hostname=platform.node(),
        is_admin=is_admin,
        privilege_level="ADMINISTRATOR" if is_admin else "STANDARD_USER",
        cpu_count=psutil.cpu_count(logical=True) or 1,
        cpu_percent=psutil.cpu_percent(interval=None),
        memory_total=vmem.total,
        memory_available=vmem.available,
        memory_used=vmem.used,
        memory_percent=vmem.percent,
        partitions=partitions,
        workspace_disk=workspace_disk,
        detected_devices_count=detected_devices_count,
        active_operations_count=active_operations,
        completed_operations_count=completed_operations,
        failed_operations_count=failed_operations,
        timestamp=datetime.utcnow()
    )
