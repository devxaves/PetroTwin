from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env file."""

    database_url: str = (
        "postgresql+asyncpg://thermotwin:thermotwin@localhost:5432/thermotwin"
    )
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = ["http://localhost:3000"]
    debug: bool = False
    jwt_secret_key: str = "thermotwin-super-secret-production-key-2026"
    sentry_dsn: str | None = None

    @field_validator("database_url", mode="before")
    @classmethod
    def clean_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
