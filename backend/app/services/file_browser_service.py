import os
import psutil
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.sanitization.algorithms import calculate_file_sha256

def get_filesystem_roots() -> List[Dict[str, Any]]:
    """Return available mounted drives on the system."""
    roots = []
    for partition in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            roots.append({
                "name": partition.mountpoint,
                "path": partition.mountpoint,
                "is_dir": True,
                "size": usage.total,
                "filesystem": partition.fstype,
                "total_size": usage.total,
                "free_size": usage.free
            })
        except Exception:
            pass
    return roots

def list_directory_contents(target_path: Optional[str] = None) -> Dict[str, Any]:
    """
    List contents of a directory safely with real file metadata.
    If no path is provided, returns system drive roots.
    """
    if not target_path or target_path.strip() == "":
        return {
            "current_path": "",
            "parent_path": None,
            "items": get_filesystem_roots()
        }

    norm_path = os.path.abspath(target_path)
    if not os.path.exists(norm_path):
        raise FileNotFoundError(f"Path does not exist: {target_path}")
    if not os.path.isdir(norm_path):
        raise NotADirectoryError(f"Target is not a directory: {target_path}")

    parent_path = os.path.dirname(norm_path)
    if parent_path == norm_path:
        parent_path = ""  # Reached drive root

    items = []
    try:
        with os.scandir(norm_path) as entries:
            for entry in entries:
                try:
                    is_dir = entry.is_dir(follow_symlinks=False)
                    stat = entry.stat(follow_symlinks=False)
                    size = stat.st_size if not is_dir else 0
                    ext = os.path.splitext(entry.name)[1].lower() if not is_dir else None

                    # Fast SHA-256 for small files (< 10 MB) to inspect metadata
                    sha256 = None
                    if not is_dir and size > 0 and size < 10 * 1024 * 1024:
                        try:
                            sha256 = calculate_file_sha256(entry.path)
                        except Exception:
                            pass

                    items.append({
                        "name": entry.name,
                        "path": entry.path,
                        "is_dir": is_dir,
                        "size": size,
                        "extension": ext,
                        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat() if hasattr(stat, "st_ctime") else None,
                        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat() if hasattr(stat, "st_mtime") else None,
                        "accessed_at": datetime.fromtimestamp(stat.st_atime).isoformat() if hasattr(stat, "st_atime") else None,
                        "sha256": sha256
                    })
                except (PermissionError, OSError):
                    # Locked system file or access restricted
                    continue
    except PermissionError:
        raise PermissionError(f"Access denied to directory: {norm_path}")

    # Sort directories first, then alphabetical
    items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

    return {
        "current_path": norm_path,
        "parent_path": parent_path,
        "items": items
    }

def calculate_folder_summary(folder_path: str) -> Dict[str, Any]:
    """Recursively calculate file count, total size, and directory count for pre-sanitization review."""
    norm_path = os.path.abspath(folder_path)
    if not os.path.isdir(norm_path):
        raise NotADirectoryError(f"Path is not a directory: {folder_path}")

    total_files = 0
    total_dirs = 0
    total_size = 0

    for root, dirs, files in os.walk(norm_path):
        total_dirs += len(dirs)
        for f in files:
            total_files += 1
            file_p = os.path.join(root, f)
            try:
                total_size += os.path.getsize(file_p)
            except (PermissionError, OSError):
                pass

    return {
        "folder_path": norm_path,
        "total_files": total_files,
        "total_directories": total_dirs,
        "total_size": total_size
    }
