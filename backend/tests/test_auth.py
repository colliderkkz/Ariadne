from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
import pytest
from sqlalchemy import select

from app.core.security import create_access_token, verify_password
from app.models.user import User


def test_register_login_and_current_user(client, session_factory, register_and_login):
    user, headers = register_and_login()
    assert "password" not in user and "hashed_password" not in user
    assert client.get("/api/v1/users/me", headers=headers).json() == user
    with session_factory() as db:
        stored = db.scalar(select(User).where(User.email == user["email"]))
        assert stored.hashed_password != "learn-python-123"
        assert stored.hashed_password.startswith("$argon2id$")
        assert verify_password("learn-python-123", stored.hashed_password)


def test_case_insensitive_email_and_duplicate_registration(client, register_and_login):
    user, _ = register_and_login("Learner@Example.com")
    assert user["email"] == "learner@example.com"
    duplicate = client.post(
        "/api/v1/auth/register",
        json={
            "email": "LEARNER@example.com",
            "display_name": "另一个名字",
            "password": "password123",
        },
    )
    assert duplicate.status_code == 409
    # 冲突后数据库会话仍可处理下一次合法写入。
    register_and_login("another@example.com")


@pytest.mark.parametrize("email", ["learner@example.com", "missing@example.com"])
def test_invalid_login_does_not_reveal_account_existence(client, register_and_login, email):
    register_and_login()
    response = client.post(
        "/api/v1/auth/login", data={"username": email, "password": "wrong-password"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "邮箱或密码错误，或账号不可用"
    assert response.headers["www-authenticate"] == "Bearer"


def test_login_response_is_not_cacheable(client, register_and_login):
    register_and_login()
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "learner@example.com", "password": "learn-python-123"},
    )
    assert response.json()["expires_in"] == 1800
    assert response.json()["token_type"] == "bearer"
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer invalid-token"}])
def test_protected_endpoint_requires_valid_token(client, headers):
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize(
    "mutation",
    ["expired", "signature", "algorithm", "audience", "issuer", "type", "subject", "missing_exp"],
)
def test_reject_invalid_jwt(client, register_and_login, settings, mutation):
    user, _ = register_and_login()
    now = datetime.now(UTC)
    payload = {
        "sub": user["id"],
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "type": "access",
    }
    key = settings.jwt_secret_key.get_secret_value()
    algorithm = "HS256"
    if mutation == "expired":
        payload["exp"] = now - timedelta(seconds=1)
    elif mutation == "signature":
        key = "another-secret-key-that-is-at-least-32-bytes"
    elif mutation == "algorithm":
        algorithm = "HS384"
    elif mutation == "audience":
        payload["aud"] = "other-client"
    elif mutation == "issuer":
        payload["iss"] = "other-api"
    elif mutation == "type":
        payload["type"] = "refresh"
    elif mutation == "subject":
        payload["sub"] = "not-a-uuid"
    else:
        del payload["exp"]
    token = jwt.encode(payload, key, algorithm=algorithm)
    assert (
        client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"}).status_code
        == 401
    )


def test_deleted_and_inactive_accounts_cannot_use_tokens(
    client, register_and_login, session_factory, settings
):
    user, headers = register_and_login()
    with session_factory() as db:
        stored = db.get(User, UUID(user["id"]))
        stored.is_active = False
        db.commit()
    assert client.get("/api/v1/users/me", headers=headers).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/login",
            data={"username": user["email"], "password": "learn-python-123"},
        ).status_code
        == 401
    )
    missing_user_token = create_access_token(uuid4(), settings)
    assert (
        client.get(
            "/api/v1/users/me", headers={"Authorization": f"Bearer {missing_user_token}"}
        ).status_code
        == 401
    )


@pytest.mark.parametrize(
    "changes",
    [{"email": "invalid"}, {"display_name": "  "}, {"password": "aB3!xy"}, {"is_active": True}],
)
def test_registration_validation_does_not_echo_password(client, changes):
    body = {"email": "test@example.com", "display_name": "测试", "password": "secret-password"}
    body.update(changes)
    response = client.post("/api/v1/auth/register", json=body)
    assert response.status_code == 422
    assert body["password"] not in response.text
    assert all("input" not in error for error in response.json()["detail"])


def test_password_whitespace_is_preserved(client, register_and_login):
    register_and_login(password="  significant-spaces  ")
    assert (
        client.post(
            "/api/v1/auth/login",
            data={"username": "learner@example.com", "password": "significant-spaces"},
        ).status_code
        == 401
    )


def test_email_normalization_is_consistent_for_login(client, register_and_login):
    user, _ = register_and_login("learner@xn--bcher-kva.de")
    assert user["email"] == "learner@bücher.de"
    assert (
        client.post(
            "/api/v1/auth/login",
            data={"username": "learner@bücher.de", "password": "learn-python-123"},
        ).status_code
        == 200
    )
