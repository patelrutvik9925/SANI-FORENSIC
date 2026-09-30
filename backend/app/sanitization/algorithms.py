import os
import secrets
import hashlib
import time
import logging
from typing import Callable, Optional, Dict, Any

logger = logging.getLogger("sani_forensic.sanitization.algorithms")

CHUNK_SIZE = 64 * 1024  # 64 KB chunk size for efficient I/O

SANITIZATION_METHODS = {
    "NIST_800_88_CLEAR": {
        "name": "NIST SP 800-88 Rev. 1 (Clear)",
        "passes": 1,
        "standard": "NIST Special Publication 800-88 Revision 1",
        "description": "Logical overwrite of all addressable storage locations with logical zeroes (0x00). Suitable for magnetic media and ATA/SATA sanitization.",
        "media_types": "HDD, USB, Flash Media",
        "ssd_notes": "Note: On SSDs, Flash Translation Layers (FTL) and wear-leveling may leave over-provisioned or retired blocks unaffected. Hardware Cryptographic Erase or ATA Secure Erase is recommended for SSDs."
    },
    "RANDOM_OVERWRITE": {
        "name": "Pseudo-Random Single Pass",
        "passes": 1,
        "standard": "Custom Forensic Baseline",
        "description": "Single-pass overwrite using cryptographically strong pseudo-random byte patterns.",
        "media_types": "HDD, USB, Flash Media",
        "ssd_notes": "Provides high entropy overwrite. Same FTL limitations apply to solid-state drives."
    },
    "DOD_5220_22M": {
        "name": "DoD 5220.22-M (3 Passes)",
        "passes": 3,
        "standard": "National Industrial Security Program Operating Manual (NISPOM)",
        "description": "3-pass sanitization: Pass 1 writes binary zeroes (0x00), Pass 2 writes binary ones (0xFF), Pass 3 writes pseudo-random noise. Verified upon completion.",
        "media_types": "Magnetic Media (HDD)",
        "ssd_notes": "Not recommended for modern SSDs due to excessive flash write cycles with no additional security benefit over single-pass or crypto-erase."
    }
}

def calculate_file_sha256(file_path: str) -> str:
    """Calculate SHA-256 hash of a file before or after sanitization."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(CHUNK_SIZE):
            hasher.update(chunk)
    return hasher.hexdigest()

def wipe_file_passes(
    file_path: str,
    method: str = "NIST_800_88_CLEAR",
    progress_callback: Optional[Callable[[float, int, int], None]] = None
) -> Dict[str, Any]:
    """
    Securely overwrite a file on disk using the specified sanitization standard.
    Overwrites bytes, flushes to disk via fsync, truncates, renames to obscure metadata, then unlinks.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Target file does not exist: {file_path}")

    file_size = os.path.getsize(file_path)
    pre_hash = calculate_file_sha256(file_path) if file_size > 0 else "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    method_meta = SANITIZATION_METHODS.get(method, SANITIZATION_METHODS["NIST_800_88_CLEAR"])
    num_passes = method_meta["passes"]

    total_bytes_to_write = file_size * num_passes
    bytes_written_so_far = 0

    if file_size > 0:
        with open(file_path, "r+b") as f:
            for current_pass in range(1, num_passes + 1):
                f.seek(0)
                bytes_remaining = file_size

                # Determine fill pattern
                if method == "DOD_5220_22M":
                    if current_pass == 1:
                        fill_byte = b"\x00"
                    elif current_pass == 2:
                        fill_byte = b"\xFF"
                    else:
                        fill_byte = None  # Random
                elif method == "RANDOM_OVERWRITE":
                    fill_byte = None
                else:  # NIST Clear
                    fill_byte = b"\x00"

                while bytes_remaining > 0:
                    write_size = min(CHUNK_SIZE, bytes_remaining)
                    if fill_byte is not None:
                        pattern = fill_byte * write_size
                    else:
                        pattern = secrets.token_bytes(write_size)

                    f.write(pattern)
                    bytes_remaining -= write_size
                    bytes_written_so_far += write_size

                    if progress_callback and total_bytes_to_write > 0:
                        pct = (bytes_written_so_far / total_bytes_to_write) * 100.0
                        progress_callback(pct, bytes_written_so_far, total_bytes_to_write)

                # Force flush to physical platter / NAND controller
                f.flush()
                os.fsync(f.fileno())

            # Truncate file size to 0
            f.truncate(0)
            f.flush()
            os.fsync(f.fileno())

    # Obscure original filename in directory inode/MFT table by renaming before deletion
    parent_dir = os.path.dirname(file_path)
    obfuscated_name = secrets.token_hex(16) + ".tmp"
    obfuscated_path = os.path.join(parent_dir, obfuscated_name)

    try:
        os.rename(file_path, obfuscated_path)
        target_to_remove = obfuscated_path
    except Exception:
        target_to_remove = file_path

    # Unlink file
    os.remove(target_to_remove)

    return {
        "pre_hash": pre_hash,
        "method": method,
        "method_name": method_meta["name"],
        "passes": num_passes,
        "bytes_processed": total_bytes_to_write,
        "verified_deleted": not os.path.exists(file_path) and not os.path.exists(obfuscated_path),
        "timestamp": time.time()
    }
