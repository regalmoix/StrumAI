import os
from pathlib import Path

from pydantic_settings import BaseSettings

_CODESPACE_NAME = os.environ.get("CODESPACE_NAME")


class Settings(BaseSettings):
    model_config = {"env_prefix": "STRUM_"}

    db_path: Path = Path(__file__).resolve().parent.parent.parent / "data" / "strumai.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    environment: str = "development"
    log_level: str = "INFO"
    frontend_dist: Path = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    codespace_name: str | None = _CODESPACE_NAME


settings = Settings()
