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

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
