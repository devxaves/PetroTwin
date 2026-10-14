from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env file."""

    database_url: str = (
        "postgresql+asyncpg://petrotwin:petrotwin@localhost:5432/petrotwin"
    )
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = ["http://localhost:3000"]
    debug: bool = False
    jwt_secret_key: str = "petrotwin-super-secret-production-key-2026"
    sentry_dsn: str | None = None

    @field_validator("database_url", mode="before")
    @classmethod
    def clean_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip().strip("'\"")
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith(
                "postgresql+asyncpg://"
            ):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)

            # Sanitize query parameters for asyncpg (strip channel_binding, convert sslmode to ssl)
            try:
                import urllib.parse

                u = urllib.parse.urlsplit(v)
                path = u.path
                if (not path or path == "/") and "neon.tech" in u.netloc:
                    path = "/neondb"

                if u.query:
                    q = urllib.parse.parse_qsl(u.query, keep_blank_values=True)
                    unsupported_params = {"channel_binding", "gssencmode", "target_session_attrs"}
                    new_q = []
                    for k, val in q:
                        if k in unsupported_params:
                            continue
                        elif k == "sslmode":
                            new_q.append(("ssl", "require" if val in ("require", "verify-ca", "verify-full") else val))
                        else:
                            new_q.append((k, val))
                    v = urllib.parse.urlunsplit(
                        (u.scheme, u.netloc, path, urllib.parse.urlencode(new_q), u.fragment)
                    )
                else:
                    v = urllib.parse.urlunsplit(
                        (u.scheme, u.netloc, path, "", u.fragment)
                    )
            except Exception:
                pass
        return v

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
