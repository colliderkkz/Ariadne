from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """环境变量优先于 .env；密钥没有默认值，漏配时直接阻止启动。"""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: SecretStr
    test_database_url: SecretStr | None = None
    jwt_secret_key: SecretStr
    access_token_expire_minutes: int = Field(default=30, ge=1, le=1440)
    jwt_issuer: str = "ariadne-api"
    jwt_audience: str = "ariadne-client"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    llm_api_key: SecretStr | None = None
    llm_base_url: str = "https://api.deepseek.com/chat/completions"
    llm_model: str = "deepseek-chat"
    llm_provider: str = "deepseek"
    llm_timeout_seconds: int = Field(default=60, ge=1, le=120)

    @field_validator("llm_base_url")
    @classmethod
    def validate_llm_url(cls, value: str) -> str:
        from urllib.parse import urlsplit

        url = urlsplit(value)
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            raise ValueError("LLM_BASE_URL 必须是服务端配置的 HTTPS 地址，不能包含凭证")
        return value

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value().encode("utf-8")) < 32:
            raise ValueError("JWT_SECRET_KEY 至少需要 32 字节，请使用 secrets.token_hex(32) 生成")
        return value

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: SecretStr) -> SecretStr:
        try:
            url = make_url(value.get_secret_value())
        except ArgumentError as exc:
            raise ValueError("DATABASE_URL 不是有效的数据库连接地址") from exc
        if url.drivername != "postgresql+psycopg" or not url.database:
            raise ValueError("DATABASE_URL 必须使用 postgresql+psycopg:// 并指定数据库名")
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(cls, values: list[str]) -> list[str]:
        if "*" in values:
            raise ValueError("请为 CORS_ORIGINS 指定明确的前端地址")
        return values
