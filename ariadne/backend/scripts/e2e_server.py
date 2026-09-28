"""Playwright 专用 API 进程：只能对 *_test 数据库迁移，不触碰开发数据。"""

import os
from pathlib import Path

import uvicorn
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import make_url

from app.core.config import Settings


def main():
    settings = Settings()
    if not settings.test_database_url:
        raise RuntimeError("必须配置 TEST_DATABASE_URL")
    database_url = settings.test_database_url.get_secret_value()
    url = make_url(database_url)
    if url.drivername != "postgresql+psycopg" or not (url.database or "").endswith("_test"):
        raise RuntimeError("E2E 只能使用专用 PostgreSQL 测试库")
    os.environ["DATABASE_URL"] = database_url
    os.environ["CORS_ORIGINS"] = '["http://127.0.0.1:3100"]'
    command.upgrade(Config(str(Path(__file__).resolve().parents[1] / "alembic.ini")), "head")
    uvicorn.run("app.main:create_app", factory=True, host="127.0.0.1", port=8001)


if __name__ == "__main__":
    main()
