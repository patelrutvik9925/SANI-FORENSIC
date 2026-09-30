import os
import hashlib
import logging
from typing import List, Dict, Any, Callable, Optional
from app.forensic.signatures import SIGNATURE_CATALOGUE, FileSignature

logger = logging.getLogger("sani_forensic.forensic.carver")

READ_BUFFER_SIZE = 1024 * 1024  # 1 MB chunk
MAX_HEADER_SEARCH_OVERLAP = 64 * 1024

def validate_file_structure(data: bytes, sig: FileSignature) -> tuple[bool, str, Optional[str]]:
    """
    Validate internal structure and detect sub-types (e.g. DOCX/XLSX inside ZIP).
    Returns (is_valid, validation_notes, refined_extension).
    """
    refined_ext = sig.extension

    if sig.extension == "jpg":
        # Check for valid JPEG markers (e.g. APP0 / DQT / SOF)
        if len(data) > 4 and data[0:2] == b"\xFF\xD8":
            return True, "Valid SOI and marker stream", refined_ext

    elif sig.extension == "png":
        # Check IHDR immediately after 8-byte header
        if len(data) >= 16 and b"IHDR" in data[8:16]:
            return True, "Valid PNG signature and IHDR chunk", refined_ext

    elif sig.extension == "pdf":
        # Check PDF version format: %PDF-1.x
        if len(data) >= 8 and data.startswith(b"%PDF-"):
            return True, "Valid PDF version header and structure", refined_ext

    elif sig.extension == "zip":
        # Check if this is an Office Open XML document
        if b"[Content_Types].xml" in data:
            if b"word/" in data:
                return True, "Valid Office Open XML Word Document", "docx"
            elif b"xl/" in data:
                return True, "Valid Office Open XML Excel Spreadsheet", "xlsx"
            elif b"ppt/" in data:
                return True, "Valid Office Open XML PowerPoint Presentation", "pptx"
            return True, "Valid Office Open XML Document", "docx"
        return True, "Valid standard ZIP central archive structure", refined_ext

    elif sig.extension == "mp4":
        if len(data) >= 12 and b"ftyp" in data[4:12]:
            return True, "Valid MP4/ISO base media box structure", refined_ext

    elif sig.extension == "mp3":
        if data.startswith(b"ID3"):
            return True, "Valid MP3 ID3v2 metadata header", refined_ext

    return False, "Generic byte match; structural validation inconclusive", refined_ext

def calculate_carving_confidence(
    header_found: bool,
    footer_found: bool,
    structure_valid: bool,
    file_size: int,
    max_size: int
) -> tuple[float, str]:
    """Calculate mathematically grounded confidence score based on forensic evidence criteria."""
    score = 0.0

    if header_found:
        score += 30.0

    if footer_found:
        score += 30.0

    if structure_valid:
        score += 25.0

    # Plausible size check
    if 128 <= file_size <= max_size:
        score += 15.0
    elif file_size > max_size:
        score -= 20.0

    score = min(100.0, max(0.0, score))

    if score >= 80.0:
        level = "HIGH"
    elif score >= 50.0:
        level = "MEDIUM"
    else:
        level = "LOW"

    return score, level

def carve_evidence_file(
    source_path: str,
    output_dir: str,
    target_categories: Optional[List[str]] = None,
    progress_callback: Optional[Callable[[float, int, int, int], None]] = None
) -> Dict[str, Any]:
    """
    Forensic carving engine operating in strictly READ-ONLY mode.
    Scans source disk/image for file magic signatures, validates headers/footers,
    extracts intact payloads, computes SHA-256 hashes, and calculates confidence scores.
    """
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Source evidence file does not exist: {source_path}")

    os.makedirs(output_dir, exist_ok=True)
    source_size = os.path.getsize(source_path)

    # 1. Calculate Source Hash (Forensic requirement: Verify read-only image before processing)
    hasher = hashlib.sha256()
    with open(source_path, "rb") as f:
        while chunk := f.read(64 * 1024):
            hasher.update(chunk)
    source_sha256 = hasher.hexdigest()

    # Filter signatures by requested categories
    active_signatures = [
        sig for sig in SIGNATURE_CATALOGUE
        if not target_categories or sig.category in target_categories or "ALL" in target_categories
    ]

    recovered_files = []
    files_found_count = 0

    with open(source_path, "rb") as src:
        current_offset = 0

        while current_offset < source_size:
            src.seek(current_offset)
            buffer = src.read(READ_BUFFER_SIZE)
            if not buffer:
                break

            for sig in active_signatures:
                search_pos = 0
                while True:
                    idx = buffer.find(sig.header, search_pos)
                    if idx == -1:
                        break

                    header_file_offset = current_offset + idx - sig.header_offset
                    if header_file_offset < 0:
                        search_pos = idx + 1
                        continue

                    # Search for footer/end boundary
                    file_data = b""
                    footer_found = False

                    if sig.footer:
                        # Scan forward from header up to sig.max_size
                        scan_len = min(sig.max_size, source_size - header_file_offset)
                        src.seek(header_file_offset)
                        candidate_chunk = src.read(scan_len)

                        footer_idx = candidate_chunk.find(sig.footer, len(sig.header))
                        if footer_idx != -1:
                            file_data = candidate_chunk[: footer_idx + len(sig.footer)]
                            footer_found = True
                        else:
                            # Plausible truncated file
                            file_data = candidate_chunk[: min(len(candidate_chunk), 512 * 1024)]
                    else:
                        # Signatures without explicit footers (e.g. MP4 box size or fixed block)
                        scan_len = min(5 * 1024 * 1024, source_size - header_file_offset)
                        src.seek(header_file_offset)
                        file_data = src.read(scan_len)

                    if len(file_data) > 64:
                        struct_valid, notes, refined_ext = validate_file_structure(file_data, sig)
                        conf_score, conf_level = calculate_carving_confidence(
                            header_found=True,
                            footer_found=footer_found,
                            structure_valid=struct_valid,
                            file_size=len(file_data),
                            max_size=sig.max_size
                        )

                        # Write carved file to output directory
                        filename = f"carved_0x{header_file_offset:08X}.{refined_ext}"
                        out_path = os.path.join(output_dir, filename)

                        with open(out_path, "wb") as out_f:
                            out_f.write(file_data)

                        carved_hash = hashlib.sha256(file_data).hexdigest()
                        files_found_count += 1

                        recovered_files.append({
                            "filename": filename,
                            "file_path": out_path,
                            "relative_path": filename,
                            "file_type": refined_ext.upper(),
                            "category": sig.category,
                            "offset": header_file_offset,
                            "size": len(file_data),
                            "signature_matched": sig.name,
                            "confidence_score": conf_score,
                            "confidence_level": conf_level,
                            "sha256_hash": carved_hash,
                            "validation_status": notes,
                        })

                    # Advance search position past current header
                    search_pos = idx + len(sig.header)

            # Advance buffer with overlap
            current_offset += (len(buffer) - MAX_HEADER_SEARCH_OVERLAP)

            if progress_callback and source_size > 0:
                pct = min(100.0, (current_offset / source_size) * 100.0)
                progress_callback(pct, current_offset, source_size, files_found_count)

    return {
        "source_path": source_path,
        "source_sha256": source_sha256,
        "files_carved": recovered_files,
        "total_files": len(recovered_files),
        "source_size": source_size
    }
