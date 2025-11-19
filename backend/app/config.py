import os
from pydantic import BaseModel, Field
from datetime import timedelta


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


class Settings(BaseModel):
    app_name: str = Field(default="3D Print Manager")
    database_url: str = Field(default_factory=lambda: os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/print_manager"))
    jwt_secret: str = Field(default_factory=lambda: os.getenv("JWT_SECRET", "change-this-secret"))
    jwt_exp_minutes: int = Field(default_factory=lambda: int(os.getenv("JWT_EXPIRES_MINUTES", "120")))
    cors_origins: list[str] = Field(default_factory=lambda: [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173").split(",") if origin.strip()])
    rate_limit_requests: int = Field(default_factory=lambda: int(os.getenv("RATE_LIMIT_REQUESTS", "200")))
    rate_limit_window_seconds: int = Field(default_factory=lambda: int(os.getenv("RATE_LIMIT_WINDOW", "60")))
    admin_email: str = Field(default_factory=lambda: os.getenv("ADMIN_EMAIL", "admin@local"))
    admin_password: str = Field(default_factory=lambda: os.getenv("ADMIN_PASSWORD", "admin123"))
    timezone: str = Field(default_factory=lambda: os.getenv("LOCAL_TZ", "America/Sao_Paulo"))

    @property
    def access_token_expires(self) -> timedelta:
        return timedelta(minutes=self.jwt_exp_minutes)


settings = Settings()
