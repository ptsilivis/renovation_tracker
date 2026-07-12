"""Application settings, loaded from environment / backend/.env."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://renovation:renovation@localhost:5432/renovation"
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_hours: int = 168
    cookie_secure: bool = False
    upload_dir: str = "./uploads"
    max_upload_mb: int = 50
    seed_password: str = "kampos2026"
    # Comma-separated accounts to seed: "email:Name, email2:Name2". Keep real
    # emails here (in .env), not in seed.py. Empty → a generic demo admin.
    seed_users: str = ""

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
