import os
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import BACKEND_DIR, Settings
from app.db.base import Base
from app.main import create_app


@pytest.fixture
def settings():
    return Settings(
        _env_file=None,
        database_url="postgresql+psycopg://test:test@localhost/ariadne_test",
        jwt_secret_key="test-only-secret-do-not-use-in-deployment-123456789",
        cors_origins=["http://localhost:5173"],
    )


@pytest.fixture
def engine():
    database_url = os.getenv("TEST_DATABASE_URL")
    if database_url:
        url = make_url(database_url)
        if url.drivername != "postgresql+psycopg" or not (url.database or "").endswith("_test"):
            pytest.fail("TEST_DATABASE_URL 必须指向名称以 _test 结尾的专用 PostgreSQL 数据库")
        schema = f"test_{uuid4().hex}"
        admin_engine = create_engine(database_url)
        with admin_engine.begin() as connection:
            connection.exec_driver_sql(f'CREATE SCHEMA "{schema}"')
        test_engine = create_engine(
            database_url, connect_args={"options": f"-csearch_path={schema}"}
        )
        try:
            # PostgreSQL 测试必须通过真实迁移建表，能发现迁移与 ORM 不一致的问题。
            with test_engine.begin() as connection:
                config = Config(str(BACKEND_DIR / "alembic.ini"))
                config.attributes["connection"] = connection
                command.upgrade(config, "head")
            yield test_engine
        finally:
            test_engine.dispose()
            with admin_engine.begin() as connection:
                connection.exec_driver_sql(f'DROP SCHEMA "{schema}" CASCADE')
            admin_engine.dispose()
    else:
        # SQLite 只用于快速接口测试，正式应用配置不允许使用 SQLite。
        test_engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )

        @event.listens_for(test_engine, "connect")
        def enable_foreign_keys(connection, record):
            connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(test_engine)
        try:
            yield test_engine
        finally:
            test_engine.dispose()


@pytest.fixture
def session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def client(settings, session_factory):
    app = create_app(settings)
    app.state.session_factory = session_factory
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def register_and_login(client):
    def create(email="learner@example.com", password="learn-python-123"):
        response = client.post(
            "/api/v1/auth/register",
            json={"email": email, "display_name": "学习者", "password": password},
        )
        assert response.status_code == 201, response.text
        token = client.post("/api/v1/auth/login", data={"username": email, "password": password})
        assert token.status_code == 200, token.text
        return response.json(), {"Authorization": f"Bearer {token.json()['access_token']}"}

    return create
