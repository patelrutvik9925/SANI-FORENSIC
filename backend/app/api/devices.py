from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.entities import User
from app.schemas.devices import DeviceResponse, DeviceDetailResponse, DeviceScanResponse
from app.services.auth_service import get_current_user
from app.services.device_service import sync_and_get_all_devices, get_device_details
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/devices", tags=["Storage Devices & Hardware Telemetry"])

@router.get("", response_model=List[DeviceResponse], summary="Enumerate real detected physical storage devices")
def list_devices(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detect and return actual storage devices (HDD, SSD, NVMe, USB, External Drives) connected to the system."""
    devices = sync_and_get_all_devices(db, current_user=current_user)
    return devices

@router.get("/{device_id}", response_model=DeviceDetailResponse, summary="Get comprehensive device hardware and partition map")
def get_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve detailed hardware attributes, partition layouts, mount points, and safety constraints for a device."""
    details = get_device_details(db, device_pk=device_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found."
        )
    return details

@router.post("/{device_id}/scan", response_model=DeviceDetailResponse, summary="Perform partition and filesystem scan on device")
def scan_device(
    device_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger real hardware partition rediscovery on the specified device."""
    client_ip = request.client.host if request.client else "unknown"
    # Re-sync hardware
    sync_and_get_all_devices(db, current_user=current_user)
    details = get_device_details(db, device_pk=device_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found."
        )

    record_audit_log(
        db=db,
        action="DEVICE_SCAN",
        user=current_user,
        target_type="DEVICE",
        target_identifier=details.device_id,
        ip_address=client_ip,
        result="SUCCESS",
        details=f"Hardware partition scan executed for device {details.name} ({details.device_id})."
    )

    return details
