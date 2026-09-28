"""按配置创建专用测试库；已存在则保持不变，不删除任何数据。"""

import psycopg
from psycopg import sql
from sqlalchemy.engine import make_url

from app.core.config import Settings


def main() -> None:
    settings = Settings()
    if not settings.test_database_url:
        raise RuntimeError("请配置 TEST_DATABASE_URL")
    url = make_url(settings.test_database_url.get_secret_value())
    if url.drivername != "postgresql+psycopg" or not (url.database or "").endswith("_test"):
        raise RuntimeError("测试库名称必须以 _test 结尾")
    with psycopg.connect(
        host=url.host,
        port=url.port or 5432,
        user=url.username,
        password=url.password,
        dbname="postgres",
        autocommit=True,
    ) as connection:
        exists = connection.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (url.database,)
        ).fetchone()
        if not exists:
            connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(url.database)))
        print("Test database is ready.")


if __name__ == "__main__":
    main()
