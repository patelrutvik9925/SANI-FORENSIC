# SANI-FORENSIC — Technical Documentation

## 1. Document Purpose

This document explains the architecture, modules, workflows, database design, APIs, security controls, setup process and current implementation status of the SANI-FORENSIC project.

The documentation is based on the source code supplied in the project archive.

---

# 2. Project Overview

SANI-FORENSIC is a full-stack platform focused on two closely related operational areas:

1. **Digital forensic inspection and recovery**
2. **Secure data sanitization**

The system provides a web interface backed by a Python/FastAPI API. It uses SQLite for application state and job/audit records.

The application is designed around authenticated operator activity, storage-device inspection, controlled destructive sanitization, forensic recovery jobs and auditability.

---

# 3. High-Level Architecture

```text
┌──────────────────────────────────────────────┐
│                  Web Browser                 │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│       React + TypeScript + Vite              │
│                                              │
│ Dashboard / Devices / Sanitizer / Audit      │
│ Login / Settings / Device Details            │
└──────────────────────┬───────────────────────┘
                       │
                /api + /ws proxy
                       │
                       ▼
┌──────────────────────────────────────────────┐
│             FastAPI + Uvicorn                │
│                                              │
│ Auth │ System │ Devices │ Sanitization       │
│ Audit │ Recovery                            │
└───────┬──────────────┬──────────────┬────────┘
        │              │              │
        ▼              ▼              ▼
┌────────────┐  ┌──────────────┐  ┌──────────────┐
│ Services   │  │ Forensic     │  │ Sanitization │
│ & Workers  │  │ Carving      │  │ Algorithms   │
└──────┬─────┘  └──────────────┘  └──────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ SQLAlchemy + SQLite                          │
│ Users / Devices / Jobs / Recovery / Audit   │
│ Evidence / Reports / Hash Records / Settings │
└──────────────────────────────────────────────┘
```

---

# 4. Technology Stack

## Frontend

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Zustand
- TanStack React Query
- Axios
- Recharts
- Lucide React

## Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- pydantic-settings
- python-jose
- Passlib
- bcrypt
- psutil
- ReportLab
- aiofiles
- python-multipart
- pytest

## Database

- SQLite
- SQLAlchemy ORM

---

# 5. Repository Structure

```text
SANI-FORENSIC/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── devices/
│   │   ├── forensic/
│   │   ├── models/
│   │   ├── sanitization/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── workers/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── tests/
│
├── data/
│   └── temp/
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   ├── layouts/
    │   ├── pages/
    │   ├── services/
    │   ├── stores/
    │   └── types/
    ├── package.json
    ├── package-lock.json
    └── vite.config.ts
```

---

# 6. Backend Application Entry Point

The backend entry point is:

```text
backend/app/main.py
```

The FastAPI application is created as:

```text
app = FastAPI(...)
```

The application uses a lifespan handler to:

1. Create database tables if required.
2. Create the initial administrator if necessary.
3. Record a `SYSTEM_STARTUP` audit event.
4. Close resources on shutdown.
5. Record a `SYSTEM_SHUTDOWN` audit event.

The backend exposes:

```text
GET /
```

which returns platform/version/status information.

---

# 7. Starting the Backend

From:

```text
backend/
```

install dependencies:

```powershell
py -m pip install -r requirements.txt
```

Run:

```powershell
py -m uvicorn app.main:app --reload
```

The development server listens on:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

ReDoc:

```text
http://127.0.0.1:8000/redoc
```

---

# 8. Frontend Architecture

The frontend entry point is:

```text
frontend/src/main.tsx
```

The main application component is:

```text
frontend/src/App.tsx
```

React Router defines the application pages.

## Current routes

```text
/login
/dashboard
/devices
/devices/:id
/sanitizer
/sanitizer/:tab
/audit
/settings
```

Additional routes currently use a placeholder component to communicate scheduled functionality:

```text
/recovery
/verify
/evidence
/analysis
/reports
```

---

# 9. Frontend Authentication Flow

The frontend stores the authentication token in:

```text
localStorage
```

The token key is:

```text
sani_token
```

The authenticated user is stored under:

```text
sani_user
```

Axios automatically attaches the token:

```text
Authorization: Bearer <token>
```

If an API response returns HTTP 401, the frontend removes the stored session and redirects the user to `/login`.

---

# 10. Authentication Backend

Authentication is implemented in:

```text
backend/app/api/auth.py
backend/app/services/auth_service.py
```

The system uses:

- JWT access tokens
- Password hashing
- Role-based authorization
- Active/inactive user status

## Login

```text
POST /api/auth/login
```

Input:

```json
{
  "username": "admin",
  "password": "..."
}
```

The server:

1. Finds the user.
2. Verifies the password.
3. Checks whether the account is active.
4. Creates a JWT.
5. Records a successful or failed login audit event.
6. Returns token and user information.

---

# 11. Default Administrator

The project configuration defines:

```text
Username: admin
Email: admin@sani-forensic.local
Password: Admin@SaniForensic2026!
Role: ADMIN
```

This is development configuration and must not be treated as a production credential.

For a public repository:

- do not add real secrets;
- replace development credentials;
- use environment variables;
- change the JWT secret;
- do not commit a production `.env`.

---

# 12. System API

System endpoints are grouped under:

```text
/api/system
```

## Health

```text
GET /api/system/health
```

The test suite expects the health response to indicate:

```text
HEALTHY
```

and a connected database.

## Status

```text
GET /api/system/status
```

The status service exposes operating-system and system telemetry used by the dashboard.

The backend also uses `psutil` for system information.

---

# 13. Storage Device Detection

Device functionality is located in:

```text
backend/app/devices/
backend/app/services/device_service.py
backend/app/api/devices.py
```

There are OS-specific implementations:

```text
devices/windows.py
devices/linux.py
```

The service chooses the implementation according to the current operating system.

Device information can include:

- device ID
- name
- model
- serial
- vendor
- media type
- bus type
- capacity
- used space
- free space
- filesystem
- mount point
- removable status
- read-only status
- system-drive status
- operational status
- partitions

---

# 14. Device API

```text
GET  /api/devices
GET  /api/devices/{device_id}
POST /api/devices/{device_id}/scan
```

The list endpoint synchronizes detected devices with the database.

The detail endpoint provides more complete device and partition information.

The scan endpoint performs a deeper device/partition scan.

---

# 15. Sanitization Architecture

Sanitization is implemented through:

```text
backend/app/api/sanitization.py
backend/app/services/sanitization_service.py
backend/app/sanitization/algorithms.py
```

The frontend provides:

```text
frontend/src/pages/Sanitizer.tsx
```

The system supports:

```text
FILE
FOLDER
DRIVE
```

sanitization jobs.

---

# 16. Sanitization Methods

The implementation contains the following methods.

## NIST SP 800-88 Rev. 1 Clear

Code:

```text
NIST_800_88_CLEAR
```

Implementation:

- One pass.
- Logical zero overwrite.
- File data is written in chunks.
- Data is flushed.
- `fsync()` is used.
- File is truncated.
- Filename is temporarily obfuscated.
- File is removed.

The code also documents limitations for SSDs involving flash translation layers and wear leveling.

## Pseudo-Random Single Pass

Code:

```text
RANDOM_OVERWRITE
```

A single pass writes cryptographically generated pseudo-random bytes.

## DoD 5220.22-M

Code:

```text
DOD_5220_22M
```

Three passes:

```text
Pass 1 → 0x00
Pass 2 → 0xFF
Pass 3 → pseudo-random bytes
```

The implementation itself notes that this method is intended for magnetic media and is not recommended for modern SSDs.

---

# 17. Sanitization Safety Controls

The backend does not simply expose a raw delete command.

The sanitization flow includes:

1. Authentication.
2. Target validation.
3. Confirmation phrase validation.
4. System/boot-drive safety checks.
5. Job creation.
6. Progress tracking.
7. Audit events.
8. Error/status tracking.

The test suite explicitly verifies that an identified system/boot drive cannot be sanitized through the drive endpoint.

---

# 18. File Hashing

The sanitization algorithm calculates SHA-256 before sanitization when the target file is non-empty.

The hash function reads the file in:

```text
64 KB
```

chunks.

The pre-sanitization hash can be stored with the job.

---

# 19. Sanitization API

```text
GET  /api/sanitization/methods
GET  /api/sanitization/browse
POST /api/sanitization/folder-summary
POST /api/sanitization/file
POST /api/sanitization/folder
POST /api/sanitization/drive
GET  /api/sanitization/{job_id}
```

The API supports browsing local directories and reviewing folder summaries before destructive operations.

---

# 20. Forensic Recovery

Recovery functionality is implemented under:

```text
backend/app/forensic/
backend/app/services/recovery_service.py
backend/app/api/recovery.py
```

The recovery API describes its scan as a **strictly read-only forensic file-carving operation**.

A recovery job can operate against:

- an image;
- a raw partition;
- a directory.

The system calculates a source SHA-256 hash before scanning.

---

# 21. File Signature Catalogue

The current signature catalogue contains:

| Type | Header/Signature | Category |
|---|---|---|
| JPEG | `FF D8 FF` | IMAGE |
| PNG | PNG magic bytes | IMAGE |
| PDF | `%PDF-` | DOCUMENT |
| ZIP/Office | `PK 03 04` | ARCHIVE |
| MP4 | `ftyp` at offset 4 | VIDEO |
| MP3 | `ID3` | AUDIO |

Some signatures also define footer/trailer bytes and maximum recovery size.

---

# 22. Recovery Workflow

```text
User selects source
        ↓
POST /api/recovery/start
        ↓
Validate source
        ↓
Calculate source SHA-256
        ↓
Create recovery job
        ↓
Background recovery worker
        ↓
Scan for known signatures
        ↓
Create recovered-file records
        ↓
Calculate metadata/hash/confidence
        ↓
Review results
        ↓
Safe preview / export
```

---

# 23. Recovery APIs

```text
POST /api/recovery/start

GET /api/recovery/jobs

GET /api/recovery/jobs/{job_id}

GET /api/recovery/jobs/{job_id}/results

GET /api/recovery/jobs/{job_id}/details

GET /api/recovery/file/{file_id}/preview

POST /api/recovery/export
```

Recovery results can be filtered by:

```text
category
confidence
```

---

# 24. Safe File Preview

The recovery API provides:

```text
GET /api/recovery/file/{file_id}/preview
```

The service is intended to provide a read-only/sandboxed representation rather than directly executing a recovered artifact.

Depending on file type, the preview can provide:

- image data;
- text snippets;
- hexadecimal representation.

---

# 25. Audit Logging

Audit functionality is implemented in:

```text
backend/app/api/audit.py
backend/app/services/audit_service.py
```

Important operations are recorded as audit events.

An audit record includes fields such as:

```text
timestamp
user
role
action
target_type
target_identifier
operation_id
IP address
result
details
record_hash
prev_hash
```

---

# 26. Cryptographic Audit Chain

Each audit record contains:

```text
record_hash
prev_hash
```

The current record is linked to the previous record through its previous hash.

The API provides:

```text
GET /api/audit/verify
```

to verify the integrity of the audit chain.

The automated backend test expects a valid chain:

```text
status = VALID
broken_at_id = None
```

when the audit records have not been tampered with.

---

# 27. Audit Export

Audit logs can be exported using:

```text
GET /api/audit/export?format=csv
```

or:

```text
GET /api/audit/export?format=json
```

CSV export is generated by the audit service.

---

# 28. Database Model

The SQLAlchemy model file is:

```text
backend/app/models/entities.py
```

The current database model contains tables for:

```text
users
cases
devices
device_scans
sanitization_jobs
sanitization_methods
sanitization_verifications
files
recovery_jobs
recovered_files
evidence_items
chain_of_custody_logs
hash_records
audit_logs
reports
system_events
settings
```

---

# 29. Important Database Entities

## Users

Stores:

- username
- email
- password hash
- full name
- role
- active status
- timestamps

## Devices

Stores detected storage-device information.

## Sanitization Jobs

Tracks:

- job type
- target
- method
- passes
- status
- progress
- bytes processed
- timestamps
- operator
- errors
- confirmation code
- pre/post hashes

## Recovery Jobs

Tracks:

- source
- source hash
- scan method
- target categories
- progress
- files found
- timestamps
- operator
- errors

## Recovered Files

Tracks:

- filename
- path
- type
- category
- offset
- size
- matched signature
- confidence score
- SHA-256
- validation state
- export status

## Evidence Items

Stores evidence identity, source, description, path, size, SHA-256 and investigator information.

## Chain of Custody

Stores actions performed on evidence.

## Reports

Stores report metadata and a SHA-256 hash for the generated PDF.

---

# 30. Data Directories

The backend creates/uses:

```text
data/
├── evidence/
├── recovery/
├── reports/
├── logs/
└── temp/
```

These directories are created from the backend configuration.

---

# 31. WebSocket Support

The backend defines:

```text
/ws/jobs/{job_id}
/ws/system
```

These endpoints are intended for real-time job/system communication.

The frontend Vite server proxies WebSocket traffic to:

```text
ws://127.0.0.1:8000
```

---

# 32. Frontend Pages

## Login

Authenticates the user and starts the application session.

## Dashboard

Displays system status, storage information and recent audit information.

## Devices

Displays detected storage devices and allows navigation to device details.

## Device Details

Displays hardware/device topology and provides access to device-specific actions.

## Sanitizer

Provides the interface for:

- sanitization-method selection;
- file/folder browsing;
- target review;
- confirmation;
- sanitization job monitoring.

## Audit Logs

Provides searchable/filterable audit records and integrity verification.

## Settings

Provides application/settings-related information.

---

# 33. Planned/Placeholder Frontend Areas

The frontend intentionally marks some areas as scheduled phases rather than presenting them as complete.

These include:

### Recovery

Planned UI capabilities include:

- read-only raw image/partition scanning;
- magic-byte carving;
- confidence scoring;
- safe previews.

### Verification

Planned UI capabilities include:

- bitwise sector sampling;
- zero-ratio calculation;
- SHA-256 comparison;
- cryptographic verification seal.

### Evidence

Planned UI capabilities include:

- evidence acquisition;
- SHA-256 sealing;
- chain-of-custody tracking;
- integrity verification.

### Analysis

Planned UI capabilities include:

- EXIF/document metadata;
- filesystem timestamp correlation;
- fragment analysis;
- forensic finding summaries.

### Reports

Planned UI capabilities include:

- PDF generation;
- case headers;
- chain-of-custody logs;
- sanitization certificates;
- recovery inventories;
- cryptographic report seals.

---

# 34. Environment Configuration

The backend uses:

```text
backend/.env
```

The repository also provides:

```text
backend/.env.example
```

Configuration includes:

```text
PROJECT_NAME
VERSION
ENVIRONMENT
DEBUG
SECRET_KEY
ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
DATABASE_URL
DATA_DIRECTORY
EVIDENCE_DIRECTORY
RECOVERY_DIRECTORY
REPORT_DIRECTORY
LOG_DIRECTORY
TEMP_DIRECTORY
INITIAL_ADMIN_USERNAME
INITIAL_ADMIN_EMAIL
INITIAL_ADMIN_PASSWORD
```

For deployment, secrets and credentials must be changed.

---

# 35. Frontend Development Proxy

The Vite configuration uses port:

```text
5173
```

API proxy:

```text
/api → http://127.0.0.1:8000
```

WebSocket proxy:

```text
/ws → ws://127.0.0.1:8000
```

This allows frontend code to use relative API URLs such as:

```text
/api/auth/login
```

without hard-coding the backend host in development.

---

# 36. Running the Complete System

## Terminal 1 — Backend

```powershell
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload
```

Expected:

```text
Uvicorn running on http://127.0.0.1:8000
Application startup complete.
```

## Terminal 2 — Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

---

# 37. Verification Checklist

After startup:

### Backend

Open:

```text
http://127.0.0.1:8000/
```

Expected status:

```text
OPERATIONAL
```

Open:

```text
http://127.0.0.1:8000/docs
```

### Frontend

Open:

```text
http://localhost:5173
```

Expected initial page:

```text
Login
```

### Authentication

Use the configured development administrator.

### Dashboard

Verify system information loads.

### Devices

Verify storage-device detection.

### Audit

Verify audit records exist and integrity verification works.

### Sanitizer

Use only a disposable test file/folder.

Do **not** test destructive operations on important storage.

---

# 38. Automated Tests

The project includes:

```text
backend/tests/test_backend.py
```

The tests cover:

- password hashing;
- password verification;
- root status;
- health;
- system status;
- administrator login;
- current-user endpoint;
- audit logs;
- audit integrity;
- device enumeration;
- device details;
- system-drive sanitization safety;
- sanitization methods;
- file browsing;
- confirmation-phrase validation;
- controlled file sanitization.

Run:

```powershell
cd backend
py -m pytest
```

---

# 39. Security Considerations

The project contains destructive and forensic functionality, therefore deployment requires careful controls.

Important security requirements for a production deployment include:

1. Change the default administrator password.
2. Change the JWT `SECRET_KEY`.
3. Do not commit `.env` files containing secrets.
4. Use HTTPS for remote deployments.
5. Restrict CORS to trusted frontend origins.
6. Run destructive sanitization only with appropriate operator authorization.
7. Use dedicated test media during demonstrations.
8. Protect evidence and report directories from unauthorized access.
9. Protect generated forensic reports and hashes.
10. Keep audit records protected from unauthorized modification.

---

# 40. Important Operational Warning

A sanitization operation is potentially irreversible.

Before testing:

```text
Never select:
- Windows system drive
- personal storage containing important data
- the drive containing the project
- the drive containing irreplaceable evidence
```

Use a disposable test file, disposable directory or dedicated test storage.

---

# 41. Current Implementation Summary

### Backend implemented components

- FastAPI application
- Authentication/JWT
- User roles
- System health/status
- Windows/Linux device detection
- Device database synchronization
- Device scanning
- Sanitization jobs
- File sanitization algorithms
- Folder sanitization
- Drive sanitization API
- Sanitization method catalogue
- Forensic recovery job APIs
- Signature catalogue
- File-carving service
- Recovery result storage
- Safe preview API
- Recovery export
- Audit logs
- SHA-256 audit-chain verification
- CSV/JSON audit export
- WebSocket endpoints
- Automated backend tests

### Frontend implemented components

- Login
- Protected routing
- Dashboard
- Devices
- Device details
- Sanitizer
- Audit logs
- Settings
- API client
- Authentication state store
- Common loading/status/dialog components

### Frontend placeholder/scheduled components

- Recovery UI
- Verification UI
- Evidence UI
- Analysis UI
- Reports UI

---

# 42. Conclusion

SANI-FORENSIC is structured as a modular full-stack platform where the FastAPI backend provides the core forensic, device, sanitization, authentication and audit services, while the React frontend provides the operator interface.

The architecture separates:

```text
UI
↓
API
↓
Services
↓
Forensic/Sanitization Logic
↓
Database + Storage
```

This separation makes the project easier to extend with additional forensic analysis, verification, evidence-management and report-generation interfaces.

The supplied source should be treated as the authoritative implementation; the `/docs` API interface and source code should be used when exact request schemas or behavior need to be verified.
