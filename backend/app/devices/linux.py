import logging
from typing import List, Dict, Any

logger = logging.getLogger("sani_forensic.devices.linux")

def detect_linux_storage_devices() -> List[Dict[str, Any]]:
    """Query block devices on Linux using lsblk/sysfs (Linux platform stub)."""
    logger.info("Linux storage device query invoked.")
    # On Linux, this will parse /sys/block and lsblk -J -b -o NAME,MODEL,SERIAL,SIZE,TYPE,FSTYPE,MOUNTPOINT,RO,RM
    return []
