from typing import Dict, Any, List, Optional

class FileSignature:
    def __init__(
        self,
        name: str,
        extension: str,
        category: str,
        header: bytes,
        footer: Optional[bytes] = None,
        max_size: int = 50 * 1024 * 1024,
        header_offset: int = 0
    ):
        self.name = name
        self.extension = extension
        self.category = category
        self.header = header
        self.footer = footer
        self.max_size = max_size
        self.header_offset = header_offset

# Standard forensic signature catalogue
SIGNATURE_CATALOGUE: List[FileSignature] = [
    # JPEG: Start of Image (FF D8 FF), End of Image (FF D9)
    FileSignature(
        name="JPEG Image",
        extension="jpg",
        category="IMAGE",
        header=b"\xFF\xD8\xFF",
        footer=b"\xFF\xD9",
        max_size=30 * 1024 * 1024
    ),
    # PNG: 8-byte magic, IEND chunk trailer
    FileSignature(
        name="PNG Image",
        extension="png",
        category="IMAGE",
        header=b"\x89PNG\r\n\x1a\n",
        footer=b"IEND\xaeB`\x82",
        max_size=30 * 1024 * 1024
    ),
    # PDF: %PDF- header, %%EOF trailer
    FileSignature(
        name="PDF Document",
        extension="pdf",
        category="DOCUMENT",
        header=b"%PDF-",
        footer=b"%%EOF",
        max_size=50 * 1024 * 1024
    ),
    # ZIP / Office Open XML (DOCX, XLSX, PPTX): PK\x03\x04
    FileSignature(
        name="ZIP / Office Document",
        extension="zip",
        category="ARCHIVE",
        header=b"PK\x03\x04",
        footer=b"PK\x05\x06",
        max_size=100 * 1024 * 1024
    ),
    # MP4 / ISO Base Media: ftyp box
    FileSignature(
        name="MP4 Video",
        extension="mp4",
        category="VIDEO",
        header=b"ftyp",
        footer=None,
        max_size=100 * 1024 * 1024,
        header_offset=4
    ),
    # MP3: ID3v2 tag
    FileSignature(
        name="MP3 Audio",
        extension="mp3",
        category="AUDIO",
        header=b"ID3",
        footer=None,
        max_size=30 * 1024 * 1024
    ),
]
