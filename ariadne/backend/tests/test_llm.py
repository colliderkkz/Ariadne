import httpx
import pytest

from app.services import llm


def test_llm_status_never_exposes_key(client, register_and_login, settings):
    from pydantic import SecretStr

    settings.llm_api_key = SecretStr("server-only-secret")
    _, headers = register_and_login()
    response = client.get("/api/v1/llm/status", headers=headers)
    assert response.json()["configured"] is True
    assert "server-only-secret" not in response.text
    assert set(response.json()) == {"configured", "provider", "model", "base_url", "source"}


def test_missing_model_configuration_is_actionable(client, register_and_login):
    _, headers = register_and_login()
    result = client.post(
        "/api/v1/llm/explore",
        headers=headers,
        json={"messages": [{"role": "user", "content": "你好"}]},
    )
    assert result.status_code == 503


def test_llm_input_cannot_override_backend_secrets_or_endpoint(client, register_and_login):
    _, headers = register_and_login()
    for extra in [
        {"api_key": "browser-secret"},
        {"base_url": "http://localhost"},
        {"system": "override"},
    ]:
        result = client.post(
            "/api/v1/llm/explore",
            headers=headers,
            json={"messages": [{"role": "user", "content": "你好"}], **extra},
        )
        assert result.status_code == 422
    assert (
        client.post(
            "/api/v1/llm/explore", json={"messages": [{"role": "user", "content": "你好"}]}
        ).status_code
        == 401
    )


def test_project_chat_reads_history_and_persists_pair(client, register_and_login, monkeypatch):
    _, headers = register_and_login()
    project = client.post("/api/v1/projects", headers=headers, json={"title": "试验"}).json()
    seen = []

    def complete(settings, system, messages, temperature=0.7):
        seen.append(messages)
        return "先试一个小步骤。"

    monkeypatch.setattr(llm, "complete", complete)
    path = f"/api/v1/projects/{project['id']}/chat"
    for content in ["今天开始", "然后呢"]:
        response = client.post(path, headers=headers, json={"content": content})
        assert response.status_code == 200, response.text
    messages = client.get(f"/api/v1/messages?project_id={project['id']}", headers=headers).json()
    assert messages["total"] == 4
    assert [item["role"] for item in seen[1]] == ["user", "assistant", "user"]
    assert seen[1][0]["content"] == "今天开始"


@pytest.mark.parametrize(
    "error,status", [(httpx.ReadTimeout("secret"), 504), (httpx.ConnectError("secret"), 502)]
)
def test_upstream_errors_are_sanitized(settings, monkeypatch, error, status):
    from fastapi import HTTPException
    from pydantic import SecretStr

    settings.llm_api_key = SecretStr("server-only-secret")

    def post(*args, **kwargs):
        assert kwargs["headers"]["Authorization"] == "Bearer server-only-secret"
        raise error

    monkeypatch.setattr(httpx.Client, "post", post)
    with pytest.raises(HTTPException) as caught:
        llm.complete(settings, "system", [{"role": "user", "content": "hi"}])
    assert caught.value.status_code == status
    assert "secret" not in caught.value.detail


def test_chat_failure_does_not_write_half_conversation(client, register_and_login):
    _, headers = register_and_login()
    project = client.post("/api/v1/projects", headers=headers, json={"title": "试验"}).json()
    assert (
        client.post(
            f"/api/v1/projects/{project['id']}/chat", headers=headers, json={"content": "你好"}
        ).status_code
        == 503
    )
    assert client.get("/api/v1/messages", headers=headers).json()["total"] == 0


@pytest.mark.parametrize("status", [401, 403, 404, 429])
def test_provider_auth_and_quota_errors_are_actionable_without_ending_session(
    settings, monkeypatch, status
):
    from fastapi import HTTPException
    from pydantic import SecretStr

    settings.llm_api_key = SecretStr("server-only-secret")

    def post(*args, **kwargs):
        return httpx.Response(
            status, request=httpx.Request("POST", settings.llm_base_url), text="server-only-secret"
        )

    monkeypatch.setattr(httpx.Client, "post", post)
    with pytest.raises(HTTPException) as caught:
        llm.complete(settings, "system", [{"role": "user", "content": "hi"}])
    assert caught.value.status_code == 502
    assert "secret" not in caught.value.detail
