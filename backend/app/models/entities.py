import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, BigInteger, Float, DateTime, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    INVESTIGATOR = "INVESTIGATOR"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"

class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"

class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class VerificationStatus(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    INCONCLUSIVE = "INCONCLUSIVE"
    NOT_VERIFIED = "NOT_VERIFIED"

class ConfidenceLevel(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class ReportType(str, enum.Enum):
    SANITIZATION = "SANITIZATION"
    RECOVERY = "RECOVERY"
    EVIDENCE = "EVIDENCE"
    VERIFICATION = "VERIFICATION"
    AUDIT = "AUDIT"

# 1. Users
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    full_name = Column(String(128), nullable=True)
    role = Column(String(32), default=UserRole.OPERATOR.value, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    cases = relationship("Case", back_populates="investigator")
    audit_logs = relationship("AuditLog", back_populates="user")

# 2. Cases
class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(32), default=CaseStatus.OPEN.value, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    investigator = relationship("User", back_populates="cases")
    evidence_items = relationship("EvidenceItem", back_populates="case")
    reports = relationship("Report", back_populates="case")

# 3. Devices
class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(128), unique=True, index=True, nullable=False) # e.g. PhysicalDrive0 or Drive Letter
    name = Column(String(128), nullable=False)
    model = Column(String(256), nullable=True)
    serial = Column(String(128), nullable=True)
    vendor = Column(String(128), nullable=True)
    media_type = Column(String(64), nullable=True) # SSD, HDD, SCM, Unspecified
    bus_type = Column(String(64), nullable=True) # NVMe, SATA, USB, etc.
    capacity = Column(BigInteger, default=0) # Bytes
    used_space = Column(BigInteger, default=0)
    free_space = Column(BigInteger, default=0)
    filesystem = Column(String(64), nullable=True) # NTFS, FAT32, exFAT, etc.
    mount_point = Column(String(64), nullable=True) # e.g. C:, E:
    is_removable = Column(Boolean, default=False)
    is_readonly = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)
    operational_status = Column(String(64), default="OK")
    last_detected_at = Column(DateTime, default=datetime.datetime.utcnow)

# 4. Device Scans
class DeviceScan(Base):
    __tablename__ = "device_scans"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(128), index=True, nullable=False)
    scan_type = Column(String(64), default="QUICK")
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(32), default=JobStatus.RUNNING.value)
    details = Column(Text, nullable=True)
    detected_partitions = Column(Text, nullable=True) # JSON structure

# 5. Sanitization Jobs
class SanitizationJob(Base):
    __tablename__ = "sanitization_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(32), nullable=False) # DRIVE, FILE, FOLDER
    target_path = Column(String(512), nullable=False)
    target_device_id = Column(String(128), nullable=True)
    method = Column(String(64), nullable=False) # ZERO_PASS, RANDOM_PASS, NIST_CLEAR, NIST_PURGE
    passes = Column(Integer, default=1)
    status = Column(String(32), default=JobStatus.QUEUED.value)
    progress = Column(Float, default=0.0) # 0.0 to 100.0
    bytes_processed = Column(BigInteger, default=0)
    total_bytes = Column(BigInteger, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    error_message = Column(Text, nullable=True)
    confirmation_code = Column(String(64), nullable=False) # e.g. ERASE PhysicalDrive1
    pre_sanitization_hash = Column(String(128), nullable=True)
    post_sanitization_hash = Column(String(128), nullable=True)

# 6. Sanitization Methods
class SanitizationMethod(Base):
    __tablename__ = "sanitization_methods"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, nullable=False)
    name = Column(String(128), nullable=False)
    standard = Column(String(128), nullable=False) # e.g. NIST SP 800-88 Rev. 1, DoD 5220.22-M
    passes = Column(Integer, default=1)
    description = Column(Text, nullable=True)
    is_hardware_level = Column(Boolean, default=False)
    suitable_media = Column(String(128), default="HDD, USB")

# 7. Sanitization Verifications
class SanitizationVerification(Base):
    __tablename__ = "sanitization_verifications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("sanitization_jobs.id"), nullable=False)
    method = Column(String(64), default="BITWISE_SAMPLE") # FULL_SCAN, BITWISE_SAMPLE
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(32), default=VerificationStatus.NOT_VERIFIED.value)
    sample_sectors_checked = Column(BigInteger, default=0)
    zero_ratio = Column(Float, default=0.0)
    details = Column(Text, nullable=True)
    verified_at = Column(DateTime, default=datetime.datetime.utcnow)

# 8. Files (Targeted for sanitization / inspection)
class FileItem(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(256), nullable=False)
    path = Column(String(1024), nullable=False)
    size = Column(BigInteger, default=0)
    created_at = Column(DateTime, nullable=True)
    modified_at = Column(DateTime, nullable=True)
    accessed_at = Column(DateTime, nullable=True)
    extension = Column(String(32), nullable=True)
    sha256_hash = Column(String(64), nullable=True)
    metadata_json = Column(Text, nullable=True)

# 9. Recovery Jobs
class RecoveryJob(Base):
    __tablename__ = "recovery_jobs"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    source_type = Column(String(32), nullable=False) # DEVICE, IMAGE, FOLDER
    source_path = Column(String(1024), nullable=False)
    source_hash = Column(String(64), nullable=True) # SHA-256 before scanning
    scan_method = Column(String(64), default="SIGNATURE_CARVING")
    target_file_types = Column(String(256), nullable=True) # comma separated: jpeg,png,pdf,docx,xlsx,zip
    status = Column(String(32), default=JobStatus.QUEUED.value)
    progress = Column(Float, default=0.0)
    total_bytes = Column(BigInteger, default=0)
    processed_bytes = Column(BigInteger, default=0)
    files_found = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    error_message = Column(Text, nullable=True)

# 10. Recovered Files
class RecoveredFile(Base):
    __tablename__ = "recovered_files"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("recovery_jobs.id"), nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    original_filename = Column(String(256), nullable=False)
    relative_path = Column(String(1024), nullable=False)
    file_type = Column(String(64), nullable=False) # JPEG, PNG, PDF, ZIP, etc.
    category = Column(String(64), default="DOCUMENT") # IMAGE, DOCUMENT, ARCHIVE, AUDIO, VIDEO
    offset = Column(BigInteger, nullable=False)
    size = Column(BigInteger, nullable=False)
    signature_matched = Column(String(64), nullable=True)
    confidence_score = Column(Float, default=0.0) # 0.0 to 100.0
    confidence_level = Column(String(32), default=ConfidenceLevel.LOW.value)
    sha256_hash = Column(String(64), nullable=True)
    validation_status = Column(String(64), default="PENDING")
    is_exported = Column(Boolean, default=False)
    recovery_timestamp = Column(DateTime, default=datetime.datetime.utcnow)

# 11. Evidence Items
class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(Integer, primary_key=True, index=True)
    evidence_number = Column(String(64), unique=True, index=True, nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    source = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(1024), nullable=False)
    file_size = Column(BigInteger, default=0)
    sha256_hash = Column(String(64), nullable=False)
    acquisition_time = Column(DateTime, default=datetime.datetime.utcnow)
    investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recovery_method = Column(String(128), nullable=True)
    status = Column(String(64), default="SECURED") # SECURED, IN_ANALYSIS, RELEASED

    case = relationship("Case", back_populates="evidence_items")
    chain_of_custody = relationship("ChainOfCustodyLog", back_populates="evidence")

# 12. Chain of Custody Logs
class ChainOfCustodyLog(Base):
    __tablename__ = "chain_of_custody_logs"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(Integer, ForeignKey("evidence_items.id"), nullable=False)
    action = Column(String(64), nullable=False) # CREATED, VIEWED, EXPORTED, HASH_VERIFIED, ADDED_TO_REPORT
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, nullable=True)
    verification_hash = Column(String(64), nullable=True)
    ip_address = Column(String(64), nullable=True)

    evidence = relationship("EvidenceItem", back_populates="chain_of_custody")

# 13. Hash Records
class HashRecord(Base):
    __tablename__ = "hash_records"

    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(String(64), nullable=False) # EVIDENCE, RECOVERED_FILE, SOURCE, REPORT
    item_id = Column(String(128), nullable=False)
    algorithm = Column(String(32), default="SHA-256")
    hash_value = Column(String(128), nullable=False)
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow)
    calculated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

# 14. Audit Logs (with cryptographic hash chaining)
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(64), nullable=True)
    role = Column(String(32), nullable=True)
    action = Column(String(128), nullable=False, index=True)
    target_type = Column(String(64), nullable=True) # DEVICE, FILE, EVIDENCE, REPORT, SYSTEM, AUTH
    target_identifier = Column(String(256), nullable=True)
    operation_id = Column(String(128), nullable=True)
    ip_address = Column(String(64), nullable=True)
    result = Column(String(32), default="SUCCESS") # SUCCESS, FAILED, DENIED
    details = Column(Text, nullable=True)
    record_hash = Column(String(64), nullable=False) # SHA-256(timestamp + action + target + user + prev_hash)
    prev_hash = Column(String(64), nullable=True)

    user = relationship("User", back_populates="audit_logs")

# 15. Reports
class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_uid = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(256), nullable=False)
    report_type = Column(String(64), nullable=False) # SANITIZATION, RECOVERY, EVIDENCE, VERIFICATION, AUDIT
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    file_path = Column(String(1024), nullable=False)
    sha256_hash = Column(String(64), nullable=False) # Cryptographic seal of the PDF
    summary_json = Column(Text, nullable=True)

    case = relationship("Case", back_populates="reports")

# 16. System Events
class SystemEvent(Base):
    __tablename__ = "system_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False)
    severity = Column(String(32), default="INFO") # INFO, WARNING, ERROR, CRITICAL
    message = Column(Text, nullable=False)
    source_module = Column(String(64), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

# 17. Settings
class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(128), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    category = Column(String(64), default="GENERAL")
    description = Column(String(256), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
