# SANI-FORENSIC

**SANI-FORENSIC** is a full-stack digital forensics and secure data sanitization platform built for the SIH-149 project.

The project combines a **FastAPI/Python backend**, a **React + TypeScript frontend**, and a **SQLite database**. It provides authenticated access to system telemetry, storage-device inspection, secure file/folder sanitization, forensic recovery/file-carving functionality, and cryptographically chained audit logging.

> **Project status:** The repository contains implemented functionality as well as UI/API areas marked in the frontend as scheduled/planned phases. See the [implemented and planned functionality](#implemented-and-planned-functionality) section.

---

## 1. Main Features

### Authentication & Access Control
- Username/password login.
- JWT bearer-token authentication.
- Role-based access control.
- Admin-only user management.
- Automatic initial administrator creation.
- Login/logout events recorded in the audit trail.

### System & Device Inspection
- System health and telemetry endpoints.
- Detection of physical storage devices.
- Device details including capacity, filesystem, mount point, media type, bus type and status.
- Partition information and device scan snapshots.
- Windows and Linux device-detection modules.

### Secure Data Sanitization
- File sanitization.
- Recursive folder sanitization.
- Physical-drive sanitization endpoint with safety checks.
- Progress tracking through sanitization jobs.
- SHA-256 pre-sanitization hashing.
- Supported methods include:
  - NIST SP 800-88 Rev. 1 Clear
  - Pseudo-Random Single Pass
  - DoD 5220.22-M style 3-pass overwrite
- Confirmation phrases are required before destructive operations.
- System/boot-drive protection is enforced by the backend.

### Forensic Recovery
- Read-only signature-based file carving.
- Source SHA-256 hashing before scanning.
- Recovery jobs with progress/status.
- Recovered-file metadata and confidence scoring.
- Safe preview support for recovered artifacts.
- Export of recovered artifacts with verification manifests.

The current signature catalogue includes:
- JPEG
- PNG
- PDF
- ZIP / Office Open XML
- MP4
- MP3

### Audit & Chain of Custody
- Audit records for important operations.
- SHA-256 hash chaining using the previous record hash.
- Audit-trail integrity verification.
- Filtering and pagination.
- CSV and JSON audit export.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Frontend build tool | Vite |
| UI styling | Tailwind CSS |
| State management | Zustand |
| Server-state/data fetching | TanStack React Query |
| HTTP client | Axios |
| Charts | Recharts |
| Backend | Python 3.x, FastAPI |
| API server | Uvicorn |
| ORM | SQLAlchemy |
| Validation/configuration | Pydantic, pydantic-settings |
| Authentication | JWT with `python-jose` |
| Password hashing | Passlib + bcrypt |
| Database | SQLite |
| PDF/report support | ReportLab |
| Testing | pytest, pytest-asyncio |

---

## 3. Project Structure

```text
SANI-FORENSIC/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── api_router.py
│   │   │   ├── auth.py
│   │   │   ├── system.py
│   │   │   ├── audit.py
│   │   │   ├── devices.py
│   │   │   ├── sanitization.py
│   │   │   └── recovery.py
│   │   │
│   │   ├── devices/
│   │   │   ├── linux.py
│   │   │   └── windows.py
│   │   │
│   │   ├── forensic/
│   │   │   ├── carver.py
│   │   │   └── signatures.py
│   │   │
│   │   ├── sanitization/
│   │   │   └── algorithms.py
│   │   │
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── models/
│   │   ├── workers/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   │
│   ├── requirements.txt
│   ├── .env.example
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types/
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
│
├── data/
│   └── temp/
│
└── DOCUMENTATION.md
```

---

## 4. Requirements

### Software
- Python 3.12 or another supported Python 3.x version.
- Node.js and npm.
- Git (for repository management).
- A modern web browser.

### Recommended environment
The backend was verified during project setup with Python **3.12.5**.

---

## 5. Backend Setup

Open a terminal in the `backend` directory:

```powershell
cd backend
```

Install Python dependencies:

```powershell
py -m pip install -r requirements.txt
```

If Pydantic reports that `email-validator` is missing, install it with:

```powershell
py -m pip install email-validator
```

> On Windows, `py` can be used instead of `python` when the Python launcher is available.

### Start the backend

```powershell
py -m uvicorn app.main:app --reload
```

The backend normally starts at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

Alternative ReDoc documentation:

```text
http://127.0.0.1:8000/redoc
```

Root status endpoint:

```text
http://127.0.0.1:8000/
```

---

## 6. Frontend Setup

Open a second terminal in the `frontend` directory:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

The Vite configuration uses port **5173** and proxies `/api` and `/ws` requests to the FastAPI backend on port **8000**.

Open:

```text
http://localhost:5173
```

---

## 7. Default Development Administrator

The application creates an initial administrator when the database is initialized.

Default development credentials configured by the project are:

```text
Username: admin
Email:    admin@sani-forensic.local
Password: Admin@SaniForensic2026!
Role:     ADMIN
```

**Security warning:** These are development credentials. Change them before deploying the application outside a controlled development/demo environment. Do not publish real production secrets in GitHub.

---

## 8. API Groups

The backend exposes the following API groups under `/api`:

```text
/api/auth
/api/system
/api/audit
/api/devices
/api/sanitization
/api/recovery
```

### Authentication
```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
GET  /api/auth/users
POST /api/auth/users
```

### System
```text
GET /api/system/status
GET /api/system/health
```

### Devices
```text
GET  /api/devices
GET  /api/devices/{device_id}
POST /api/devices/{device_id}/scan
```

### Sanitization
```text
GET  /api/sanitization/methods
GET  /api/sanitization/browse
POST /api/sanitization/folder-summary
POST /api/sanitization/file
POST /api/sanitization/folder
POST /api/sanitization/drive
GET  /api/sanitization/{job_id}
```

### Audit
```text
GET /api/audit
GET /api/audit/verify
GET /api/audit/export
```

### Recovery
```text
POST /api/recovery/start
GET  /api/recovery/jobs
GET  /api/recovery/jobs/{job_id}
GET  /api/recovery/jobs/{job_id}/results
GET  /api/recovery/jobs/{job_id}/details
GET  /api/recovery/file/{file_id}/preview
POST /api/recovery/export
```

For request/response schemas and exact parameters, use the generated Swagger documentation at `/docs`.

---

## 9. WebSocket Endpoints

The backend provides WebSocket endpoints for real-time job/system communication:

```text
/ws/jobs/{job_id}
/ws/system
```

The frontend Vite development server proxies WebSocket requests to the backend.

---

## 10. Database

SANI-FORENSIC uses SQLite with SQLAlchemy.

The application creates/uses the data directory and supporting folders for:

```text
data/
├── evidence/
├── recovery/
├── reports/
├── logs/
└── temp/
```

The database contains entities for users, cases, devices, device scans, sanitization jobs, sanitization methods, sanitization verifications, files, recovery jobs, recovered files, evidence, chain-of-custody logs, hashes, audit logs, reports, system events and settings.

---

## 11. Safety Notes

SANI-FORENSIC contains **destructive sanitization operations**.

Do not test drive sanitization on a system drive or any drive containing important data.

The backend includes safety controls such as:
- confirmation phrases;
- system/boot-drive protection;
- job tracking;
- audit logging;
- pre-operation hashing for file sanitization.

For demonstrations, use disposable test files, folders, or dedicated test media.

---

## 12. Testing

From the `backend` directory:

```powershell
py -m pytest
```

The repository includes backend tests covering authentication, health/status checks, audit integrity, device enumeration, sanitization methods, file browsing, and a controlled file-sanitization flow.

---

## 13. Build the Frontend

For a production frontend build:

```powershell
cd frontend
npm run build
```

Preview the built application with:

```powershell
npm run preview
```

---

## 14. Implemented and Planned Functionality

The frontend currently contains fully wired pages for areas such as:

- Login
- Dashboard
- Devices
- Device details
- Sanitizer
- Audit Logs
- Settings

The UI also contains placeholder pages explicitly marked as scheduled/planned for later phases, including:

- Forensic Recovery & File Carving UI
- Sanitization Verification UI
- Evidence Custody & Artifacts UI
- Forensic Timeline & Metadata Analysis UI
- Sealed Forensic Reports UI

The backend already contains recovery APIs and forensic-carving services, so the frontend placeholder status should not be interpreted as absence of the backend implementation.

---

## 15. Development Workflow

```text
Browser
   │
   ▼
React + TypeScript + Vite
   │
   │ /api and /ws proxy
   ▼
FastAPI + Uvicorn
   │
   ├── Authentication
   ├── System telemetry
   ├── Device inspection
   ├── Sanitization
   ├── Forensic recovery
   └── Audit logging
   │
   ▼
SQLAlchemy
   │
   ▼
SQLite
```

---

## 16. License

No license file was included with the supplied project archive. Add the appropriate license before distributing the project publicly.

---

## 17. SIH Project

This repository contains the SANI-FORENSIC implementation submitted/developed for **Smart India Hackathon (SIH) problem statement SIH149**.
