import os
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.auth_service import hash_password, verify_password

def test_password_hashing():
    raw_password = "SecretPassword2026!"
    hashed = hash_password(raw_password)
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_full_system_and_auth_flow():
    with TestClient(app) as client:
        # 1. Root
        root_res = client.get("/")
        assert root_res.status_code == 200
        assert root_res.json()["platform"] == "SANI-FORENSIC"
        assert root_res.json()["status"] == "OPERATIONAL"

        # 2. Health
        health_res = client.get("/api/system/health")
        assert health_res.status_code == 200
        assert health_res.json()["status"] == "HEALTHY"
        assert health_res.json()["database_connected"] is True

        # 3. System Status
        status_res = client.get("/api/system/status")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["app_name"] == "SANI-FORENSIC"
        assert "is_admin" in status_data
        assert "memory_total" in status_data
        assert "workspace_disk" in status_data
        assert isinstance(status_data["partitions"], list)

        # 4. Admin Login
        login_res = client.post(
            "/api/auth/login",
            json={
                "username": settings.INITIAL_ADMIN_USERNAME,
                "password": settings.INITIAL_ADMIN_PASSWORD
            }
        )
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        assert token_data["role"] == "ADMIN"
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 5. Get current user profile
        me_res = client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["username"] == settings.INITIAL_ADMIN_USERNAME

        # 6. Audit Logs
        audit_res = client.get("/api/audit", headers=headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert len(logs) > 0
        assert "record_hash" in logs[0]

        # 7. Audit Integrity Verification
        verify_res = client.get("/api/audit/verify", headers=headers)
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["status"] == "VALID"
        assert verify_data["broken_at_id"] is None

        # 8. Device Enumeration & Details (Phase 2)
        devices_res = client.get("/api/devices", headers=headers)
        assert devices_res.status_code == 200
        devices = devices_res.json()
        assert isinstance(devices, list)
        if len(devices) > 0:
            first_dev = devices[0]
            dev_id = first_dev["id"]
            detail_res = client.get(f"/api/devices/{dev_id}", headers=headers)
            assert detail_res.status_code == 200
            detail = detail_res.json()
            assert "partitions" in detail
            assert "sanitization_allowed" in detail

            # Test Safety Barrier: attempting to sanitize system drive must be rejected with 403
            if detail["is_system"]:
                sanitize_attempt = client.post(
                    "/api/sanitization/drive",
                    json={
                        "device_id": detail["device_id"],
                        "method": "NIST_800_88_CLEAR",
                        "confirmation_phrase": f"ERASE {detail['device_id']}"
                    },
                    headers=headers
                )
                assert sanitize_attempt.status_code == 403
                assert "System/Boot drive" in sanitize_attempt.json()["detail"]

        # 9. Sanitization Methods API (Phase 3)
        methods_res = client.get("/api/sanitization/methods", headers=headers)
        assert methods_res.status_code == 200
        methods = methods_res.json()
        assert "NIST_800_88_CLEAR" in methods
        assert "DOD_5220_22M" in methods

        # 10. File Browser API (Phase 3)
        browse_res = client.get("/api/sanitization/browse", headers=headers)
        assert browse_res.status_code == 200
        assert "items" in browse_res.json()

        # 11. Secure File Sanitization Execution Test (Phase 3)
        temp_dir = settings.TEMP_DIRECTORY
        os.makedirs(temp_dir, exist_ok=True)
        test_file = os.path.join(temp_dir, "forensic_test_wipe.txt")
        with open(test_file, "w") as f:
            f.write("TOP_SECRET_FORENSIC_EVIDENCE_SAMPLE_DATA_1234567890" * 100)

        assert os.path.exists(test_file)

        # Wrong confirmation phrase test
        fail_res = client.post(
            "/api/sanitization/file",
            json={
                "file_path": test_file,
                "method": "NIST_800_88_CLEAR",
                "confirmation_phrase": "WRONG_PHRASE"
            },
            headers=headers
        )
        assert fail_res.status_code == 400

        # Correct confirmation phrase test
        wipe_res = client.post(
            "/api/sanitization/file",
            json={
                "file_path": test_file,
                "method": "NIST_800_88_CLEAR",
                "confirmation_phrase": "ERASE forensic_test_wipe.txt"
            },
            headers=headers
        )
        assert wipe_res.status_code == 200
        job_data = wipe_res.json()
        assert job_data["job_type"] == "FILE"
        job_id = job_data["id"]

        # Give background task a moment to finish wiping
        time.sleep(1)
        job_check = client.get(f"/api/sanitization/{job_id}", headers=headers)
        assert job_check.status_code == 200
        assert not os.path.exists(test_file)
