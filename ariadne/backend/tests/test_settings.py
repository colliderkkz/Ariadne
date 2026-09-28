from uuid import UUID

import httpx
import pytest

from app.models.user import User

PIXEL = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAA"
    "C0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII="
)


def test_model_save_cors_preflight(client):
    response = client.options(
        "/api/v1/llm/config",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert "PUT" in response.headers["access-control-allow-methods"]


def test_profile_persists_and_is_private(client, register_and_login):
    _, first = register_and_login()
    _, second = register_and_login("second@example.com")
    payload = {"display_name": " 新名字 ", "avatar": PIXEL, "theme": "dark"}
    response = client.patch("/api/v1/users/me", headers=first, json=payload)
    assert response.status_code == 200, response.text
    stored = client.get("/api/v1/users/me", headers=first).json()
    assert (stored["display_name"], stored["avatar"], stored["theme"]) == ("新名字", PIXEL, "dark")
    other = client.get("/api/v1/users/me", headers=second).json()
    assert (other["display_name"], other["avatar"], other["theme"]) == ("学习者", None, "system")
    assert client.patch("/api/v1/users/me", json=payload).status_code == 401
    assert (
        client.patch("/api/v1/users/me", headers=first, json={**payload, "avatar": None}).json()[
            "avatar"
        ]
        is None
    )


@pytest.mark.parametrize(
    "bad",
    [
        {"display_name": " "},
        {"theme": "invalid"},
        {"avatar": "https://example.com/avatar"},
        {"avatar": "data:image/svg+xml;base64,PHN2Zz4="},
        {"avatar": "data:image/png;base64,bm90IGFuIGltYWdl"},
        {"display_name": "x" * 81},
        {"email": "changed@example.com"},
    ],
)
def test_invalid_profile_is_not_saved(client, register_and_login, bad):
    _, headers = register_and_login()
    result = client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={
            "display_name": "新名字",
            "avatar": None,
            "theme": "light",
            **bad,
        },
    )
    assert result.status_code == 422
    assert client.get("/api/v1/users/me", headers=headers).json()["display_name"] == "学习者"


def test_model_config_encrypted_isolated_and_used_everywhere(
    client, register_and_login, session_factory, monkeypatch
):
    first, headers = register_and_login()
    _, other = register_and_login("second@example.com")
    payload = {"provider": "deepseek", "model": "my-model", "api_key": "personal-secret"}
    result = client.put("/api/v1/llm/config", headers=headers, json=payload)
    assert result.status_code == 200, result.text
    assert result.json()["source"] == "personal"
    assert "personal-secret" not in result.text
    with session_factory() as db:
        stored = db.get(User, UUID(first["id"]))
        assert stored.llm_key_encrypted and "personal-secret" not in stored.llm_key_encrypted
    assert client.get("/api/v1/llm/status", headers=other).json()["configured"] is False
    assert "llm_key" not in client.get("/api/v1/users/me", headers=headers).text
    seen = []
    original_post = httpx.Client.post

    def post(self, url, **kwargs):
        if str(url).startswith("/api/"):
            return original_post(self, url, **kwargs)
        assert url == "https://api.deepseek.com/chat/completions"
        assert kwargs["headers"]["Authorization"] == "Bearer personal-secret"
        assert kwargs["json"]["model"] == "my-model"
        seen.append(kwargs["json"])
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={
                "choices": [{"message": {"content": '{"title":"下一步","content":"试一试"}'}}],
            },
        )

    monkeypatch.setattr(httpx.Client, "post", post)
    conversation = {"messages": [{"role": "user", "content": "你好"}]}
    for path in ("explore", "organize"):
        assert (
            client.post(f"/api/v1/llm/{path}", headers=headers, json=conversation).status_code
            == 200
        )
    assert (
        client.post(
            "/api/v1/llm/test", headers=headers, json={"provider": "deepseek", "model": "my-model"}
        ).status_code
        == 200
    )
    project = client.post("/api/v1/projects", headers=headers, json={"title": "试验"}).json()
    assert (
        client.post(
            f"/api/v1/projects/{project['id']}/chat", headers=headers, json={"content": "你好"}
        ).status_code
        == 200
    )
    assert len(seen) == 4


def test_model_update_keeps_key_requires_new_provider_key_and_resets(client, register_and_login):
    _, headers = register_and_login()
    path = "/api/v1/llm/config"
    payload = {"provider": "deepseek", "model": "model-one", "api_key": "secret"}
    assert client.put(path, headers=headers, json=payload).status_code == 200
    assert (
        client.put(
            path, headers=headers, json={"provider": "deepseek", "model": "model-two"}
        ).status_code
        == 200
    )
    for invalid in [
        {"provider": "openai", "model": "another"},
        {**payload, "base_url": "http://localhost"},
        {**payload, "provider": "custom"},
        {**payload, "model": " "},
    ]:
        assert client.put(path, headers=headers, json=invalid).status_code == 422
    assert client.get("/api/v1/llm/status", headers=headers).json()["model"] == "model-two"
    assert client.put(path, json=payload).status_code == 401
    reset = client.delete(path, headers=headers).json()
    assert reset["source"] == "server" and reset["configured"] is False


def test_test_connection_does_not_save_and_errors_do_not_leak_keys(
    client, register_and_login, monkeypatch
):
    _, headers = register_and_login()
    original_post = httpx.Client.post

    def fail(self, url, **kwargs):
        if str(url).startswith("/api/"):
            return original_post(self, url, **kwargs)
        raise httpx.ConnectError("secret-key")

    monkeypatch.setattr(httpx.Client, "post", fail)
    response = client.post(
        "/api/v1/llm/test",
        headers=headers,
        json={
            "provider": "deepseek",
            "model": "test",
            "api_key": "secret-key",
        },
    )
    assert response.status_code == 502
    assert "secret-key" not in response.text
    assert client.get("/api/v1/llm/status", headers=headers).json()["source"] == "server"
