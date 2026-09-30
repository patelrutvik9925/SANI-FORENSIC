import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

# Resolve absolute paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = BACKEND_DIR.parent
DATA_DIR = BASE_DIR / "data"

# Ensure data directory exists immediately
DATA_DIR.mkdir(parents=True, exist_ok=True)
(DATA_DIR / "evidence").mkdir(parents=True, exist_ok=True)
(DATA_DIR / "recovery").mkdir(parents=True, exist_ok=True)
(DATA_DIR / "reports").mkdir(parents=True, exist_ok=True)
(DATA_DIR / "logs").mkdir(parents=True, exist_ok=True)
(DATA_DIR / "temp").mkdir(parents=True, exist_ok=True)

SQLITE_PATH = (DATA_DIR / "sani_forensic.db").as_posix()

class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "SANI-FORENSIC"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security & Auth
    SECRET_KEY: str = "sani-forensic-dev-secret-key-change-in-production-min-32-chars!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Database: Absolute path to ensure consistent location regardless of CWD
    DATABASE_URL: str = f"sqlite:///{SQLITE_PATH}"

    # Storage Paths
    DATA_DIRECTORY: str = str(DATA_DIR)
    EVIDENCE_DIRECTORY: str = str(DATA_DIR / "evidence")
    RECOVERY_DIRECTORY: str = str(DATA_DIR / "recovery")
    REPORT_DIRECTORY: str = str(DATA_DIR / "reports")
    LOG_DIRECTORY: str = str(DATA_DIR / "logs")
    TEMP_DIRECTORY: str = str(DATA_DIR / "temp")

    # Initial Admin Credentials
    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_EMAIL: str = "admin@sani-forensic.local"
    INITIAL_ADMIN_PASSWORD: str = "Admin@SaniForensic2026!"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
