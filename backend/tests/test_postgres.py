from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import UUID

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app.core.config import BACKEND_DIR
from app.models.user import User
from app.services import auth

pytestmark = pytest.mark.postgres


def test_migrations_match_models_and_support_round_trip(engine):
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.check(config)
        command.downgrade(config, "base")
        assert not inspect(connection).has_table("users")
        command.upgrade(config, "head")
        assert inspect(connection).has_table("ideas")


def test_database_unique_constraint_and_cascade(client, register_and_login, session_factory):
    user, headers = register_and_login()
    path = client.post("/api/v1/ideas", headers=headers, json={"title": "持久化"}).headers[
        "location"
    ]
    with session_factory() as db:
        db.add(User(email=user["email"], display_name="重复邮箱", hashed_password="unused"))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        db.delete(db.get(User, UUID(user["id"])))
        db.commit()
    # 删除用户使旧 JWT 失效，外键级联同时清理想法。
    assert client.get(path, headers=headers).status_code == 401
    from app.models.idea import Idea

    with session_factory() as db:
        assert db.get(Idea, UUID(path.rsplit("/", 1)[1])) is None


def test_concurrent_registration_returns_conflict_instead_of_500(client, monkeypatch):
    barrier = Barrier(2)
    original_hash = auth.hash_password

    def synchronized_hash(password):
        # 确保两个请求都通过邮箱预检查，真正触发数据库唯一约束竞争。
        barrier.wait(timeout=10)
        return original_hash(password)

    monkeypatch.setattr(auth, "hash_password", synchronized_hash)

    def register():
        return client.post(
            "/api/v1/auth/register",
            json={"email": "race@example.com", "display_name": "并发", "password": "race-password"},
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(register) for _ in range(2)]
        assert sorted(future.result(timeout=15) for future in futures) == [201, 409]
