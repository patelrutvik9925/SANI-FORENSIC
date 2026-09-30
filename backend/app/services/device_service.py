import platform
import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.entities import Device, DeviceScan, JobStatus, User
from app.schemas.devices import DeviceDetailResponse, PartitionDetail
from app.services.system_service import check_admin_privileges
from app.services.audit_service import record_audit_log

if platform.system() == "Windows":
    from app.devices.windows import detect_windows_storage_devices as detect_devices_os
else:
    from app.devices.linux import detect_linux_storage_devices as detect_devices_os

logger = logging.getLogger("sani_forensic.services.device")

def sync_and_get_all_devices(db: Session, current_user: Optional[User] = None) -> List[Device]:
    """Scan OS for storage hardware, persist/update in database, and return detected devices."""
    detected_raw = detect_devices_os()
    now = datetime.utcnow()
    synced_devices = []

    for item in detected_raw:
        dev_id = item["device_id"]
        existing = db.query(Device).filter(Device.device_id == dev_id).first()

        if existing:
            existing.name = item["name"]
            existing.model = item["model"]
            existing.serial = item["serial"]
            existing.vendor = item["vendor"]
            existing.media_type = item["media_type"]
            existing.bus_type = item["bus_type"]
            existing.capacity = item["capacity"]
            existing.used_space = item["used_space"]
            existing.free_space = item["free_space"]
            existing.filesystem = item["filesystem"]
            existing.mount_point = item["mount_point"]
            existing.is_removable = item["is_removable"]
            existing.is_readonly = item["is_readonly"]
            existing.is_system = item["is_system"]
            existing.operational_status = item["operational_status"]
            existing.last_detected_at = now
            synced_devices.append(existing)
        else:
            new_dev = Device(
                device_id=dev_id,
                name=item["name"],
                model=item["model"],
                serial=item["serial"],
                vendor=item["vendor"],
                media_type=item["media_type"],
                bus_type=item["bus_type"],
                capacity=item["capacity"],
                used_space=item["used_space"],
                free_space=item["free_space"],
                filesystem=item["filesystem"],
                mount_point=item["mount_point"],
                is_removable=item["is_removable"],
                is_readonly=item["is_readonly"],
                is_system=item["is_system"],
                operational_status=item["operational_status"],
                last_detected_at=now
            )
            db.add(new_dev)
            synced_devices.append(new_dev)

        # Store partition scan snapshot
        partitions = item.get("partitions", [])
        if partitions:
            scan = DeviceScan(
                device_id=dev_id,
                scan_type="INITIAL_HARDWARE_DISCOVERY",
                started_at=now,
                completed_at=now,
                status=JobStatus.COMPLETED.value,
                details=f"Discovered {len(partitions)} partition(s).",
                detected_partitions=json.dumps(partitions)
            )
            db.add(scan)

    db.commit()
    for d in synced_devices:
        db.refresh(d)

    return synced_devices

def get_device_details(db: Session, device_pk: int) -> Optional[DeviceDetailResponse]:
    """Retrieve full device details including partition table and sanitization safety assessment."""
    device = db.query(Device).filter(Device.id == device_pk).first()
    if not device:
        return None

    # Retrieve latest partition scan
    latest_scan = db.query(DeviceScan).filter(
        DeviceScan.device_id == device.device_id
    ).order_by(DeviceScan.id.desc()).first()

    partitions = []
    if latest_scan and latest_scan.detected_partitions:
        try:
            parts_raw = json.loads(latest_scan.detected_partitions)
            partitions = [
                PartitionDetail(
                    partition_number=p.get("partition_number", 0),
                    size=p.get("size", 0),
                    type=p.get("type"),
                    drive_letter=p.get("drive_letter"),
                    is_system=bool(p.get("is_system")),
                    is_boot=bool(p.get("is_boot")),
                    volume_label=p.get("volume_label"),
                    filesystem=p.get("filesystem")
                )
                for p in parts_raw
            ]
        except Exception:
            pass

    # Evaluate safety barriers
    is_admin = check_admin_privileges()
    sanitization_allowed = True
    sanitization_block_reason = None

    if device.is_system:
        sanitization_allowed = False
        sanitization_block_reason = "Protected System / Boot Drive. Direct sanitization is prohibited to prevent destruction of the running operating system."
    elif not is_admin:
        sanitization_allowed = False
        sanitization_block_reason = "Administrator privileges required. Raw disk physical writes require running SANI-FORENSIC as Administrator."
    elif device.is_readonly:
        sanitization_allowed = False
        sanitization_block_reason = "Storage device is marked Hardware/Software Read-Only."

    return DeviceDetailResponse(
        id=device.id,
        device_id=device.device_id,
        name=device.name,
        model=device.model,
        serial=device.serial,
        vendor=device.vendor,
        media_type=device.media_type,
        bus_type=device.bus_type,
        capacity=device.capacity,
        used_space=device.used_space,
        free_space=device.free_space,
        filesystem=device.filesystem,
        mount_point=device.mount_point,
        is_removable=device.is_removable,
        is_readonly=device.is_readonly,
        is_system=device.is_system,
        operational_status=device.operational_status,
        last_detected_at=device.last_detected_at,
        partitions=partitions,
        sanitization_allowed=sanitization_allowed,
        sanitization_block_reason=sanitization_block_reason
    )
