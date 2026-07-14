"""Application settings, loaded from environment / backend/.env."""
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# The insecure defaults that are fine for local dev but must never reach prod.
DEV_JWT_SECRET = "dev-secret-change-me"
_MIN_SECRET_LEN = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Deployment environment. Set RENOHUB_ENV=prod on the real host; the guard
    # below then refuses to boot with dev-grade secrets or an insecure cookie.
    environment: str = Field(default="dev", validation_alias="RENOHUB_ENV")
    database_url: str = "postgresql+psycopg://renovation:renovation@localhost:5432/renovation"
    jwt_secret: str = DEV_JWT_SECRET
    jwt_expire_hours: int = 168
    cookie_secure: bool = False
    upload_dir: str = "./uploads"
    max_upload_mb: int = 50
    seed_password: str = "kampos2026"
    # Comma-separated accounts to seed: "email:Name, email2:Name2". Keep real
    # emails here (in .env), not in seed.py. Empty → a generic demo admin.
    seed_users: str = ""

    @property
    def is_prod(self) -> bool:
        return self.environment.strip().lower() in ("prod", "production")

    @model_validator(mode="after")
    def _guard_production_config(self) -> "Settings":
        """Fail-fast: never boot a production instance with unsafe defaults."""
        if not self.is_prod:
            return self
        problems: list[str] = []
        if self.jwt_secret == DEV_JWT_SECRET or len(self.jwt_secret) < _MIN_SECRET_LEN:
            problems.append(
                f"JWT_SECRET must be a strong non-default value (>= {_MIN_SECRET_LEN} chars). "
                'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        if not self.cookie_secure:
            problems.append("COOKIE_SECURE must be true in production (HTTPS-only auth cookie).")
        if problems:
            raise RuntimeError(
                "Refusing to boot with RENOHUB_ENV=prod and unsafe config:\n  - "
                + "\n  - ".join(problems)
            )
        return self

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
