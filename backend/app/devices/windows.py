import json
import subprocess
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("sani_forensic.devices.windows")

def run_powershell_json(script: str) -> Any:
    """Execute a PowerShell command safely and parse JSON output."""
    cmd = [
        "powershell.exe",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        f"& {{ {script} | ConvertTo-Json -Depth 4 }}"
    ]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
            check=False
        )
        if proc.returncode != 0:
            logger.error(f"PowerShell error: {proc.stderr}")
            return None
        output = proc.stdout.strip()
        if not output:
            return None
        return json.loads(output)
    except subprocess.TimeoutExpired:
        logger.error("PowerShell command timed out while querying storage.")
        return None
    except Exception as e:
        logger.error(f"Failed to query Windows storage: {e}")
        return None

def detect_windows_storage_devices() -> List[Dict[str, Any]]:
    """Query physical disks, partitions, and volumes on Windows using PowerShell WMI/Storage APIs."""
    devices = []

    # 1. Query Physical Disks
    disks_raw = run_powershell_json(
        "Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, MediaType, BusType, Size, OperationalStatus, SerialNumber"
    )
    if isinstance(disks_raw, dict):
        disks_raw = [disks_raw]
    elif not disks_raw:
        disks_raw = []

    # 2. Query Partitions
    partitions_raw = run_powershell_json(
        "Get-Partition | Select-Object DiskNumber, PartitionNumber, DriveLetter, Size, Type, IsSystem, IsBoot, IsReadOnly"
    )
    if isinstance(partitions_raw, dict):
        partitions_raw = [partitions_raw]
    elif not partitions_raw:
        partitions_raw = []

    # 3. Query Volumes
    volumes_raw = run_powershell_json(
        "Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, DriveType, SizeRemaining, Size"
    )
    if isinstance(volumes_raw, dict):
        volumes_raw = [volumes_raw]
    elif not volumes_raw:
        volumes_raw = []

    # Map volumes by DriveLetter
    volume_by_letter: Dict[str, Dict[str, Any]] = {}
    for vol in volumes_raw:
        letter = vol.get("DriveLetter")
        if letter:
            volume_by_letter[str(letter).upper()] = vol

    # Process each physical disk
    for disk in disks_raw:
        device_num = str(disk.get("DeviceId", "0"))
        device_id = f"PhysicalDrive{device_num}"
        name = disk.get("FriendlyName") or f"Physical Drive {device_num}"
        capacity = int(disk.get("Size") or 0)
        media_type = disk.get("MediaType") or "Unspecified"
        bus_type = disk.get("BusType") or "Internal"
        serial = disk.get("SerialNumber") or "N/A"
        operational_status = disk.get("OperationalStatus") or "OK"

        # Find partitions for this disk
        disk_partitions = [p for p in partitions_raw if str(p.get("DiskNumber")) == device_num]

        # Check if disk holds system or boot partition
        is_system = False
        is_boot = False
        is_readonly = False
        mount_points = []
        filesystems = set()
        used_space = 0
        free_space = 0

        partition_details = []
        for p in disk_partitions:
            p_letter = p.get("DriveLetter")
            p_is_system = bool(p.get("IsSystem"))
            p_is_boot = bool(p.get("IsBoot"))
            p_size = int(p.get("Size") or 0)

            if p_is_system:
                is_system = True
            if p_is_boot:
                is_boot = True
            if p.get("IsReadOnly"):
                is_readonly = True

            vol_info = None
            if p_letter:
                letter_str = str(p_letter).upper()
                mount_points.append(f"{letter_str}:")
                if letter_str == "C":
                    is_system = True
                if letter_str in volume_by_letter:
                    vol = volume_by_letter[letter_str]
                    vol_info = vol
                    fs = vol.get("FileSystem")
                    if fs:
                        filesystems.add(fs)
                    vol_size = int(vol.get("Size") or 0)
                    vol_remaining = int(vol.get("SizeRemaining") or 0)
                    used_space += (vol_size - vol_remaining)
                    free_space += vol_remaining

            partition_details.append({
                "partition_number": p.get("PartitionNumber"),
                "size": p_size,
                "type": p.get("Type"),
                "drive_letter": f"{p_letter}:" if p_letter else None,
                "is_system": p_is_system,
                "is_boot": p_is_boot,
                "volume_label": vol_info.get("FileSystemLabel") if vol_info else None,
                "filesystem": vol_info.get("FileSystem") if vol_info else None,
            })

        # Calculate free space if not already determined by volumes
        if free_space == 0 and capacity > used_space:
            free_space = capacity - used_space

        is_removable = bus_type.upper() in ["USB", "SD", "MMC"] or any(
            volume_by_letter.get(m.replace(":", ""), {}).get("DriveType") == "Removable" for m in mount_points
        )

        devices.append({
            "device_id": device_id,
            "name": name,
            "model": disk.get("FriendlyName"),
            "serial": serial,
            "vendor": disk.get("FriendlyName", "").split(" ")[0] if disk.get("FriendlyName") else "Unknown",
            "media_type": media_type,
            "bus_type": bus_type,
            "capacity": capacity,
            "used_space": used_space,
            "free_space": free_space,
            "filesystem": ", ".join(filesystems) if filesystems else "Raw / Unformatted",
            "mount_point": ", ".join(mount_points) if mount_points else "Unmounted",
            "is_removable": is_removable,
            "is_readonly": is_readonly,
            "is_system": is_system or is_boot,
            "operational_status": operational_status,
            "partitions": partition_details
        })

    return devices
