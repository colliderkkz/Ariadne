from uuid import uuid4

import pytest


def test_idea_crud(client, register_and_login):
    _, headers = register_and_login()
    response = client.post(
        "/api/v1/ideas",
        headers=headers,
        json={"title": " 学习后端 ", "content": "先理解请求链路", "tag_ids": ["learning"]},
    )
    assert response.status_code == 201
    idea = response.json()
    assert idea["title"] == "学习后端"
    assert idea["status"] == "inbox"
    location = response.headers["location"]
    assert client.get(location, headers=headers).json() == idea

    edited = client.patch(location, headers=headers, json={"status": "exploring"})
    assert edited.status_code == 200
    assert edited.json()["content"] == "先理解请求链路"
    assert edited.json()["status"] == "exploring"
    assert client.patch(location, headers=headers, json={"tag_ids": []}).json()["tag_ids"] == []

    page = client.get("/api/v1/ideas", headers=headers).json()
    assert page["total"] == 1
    assert page["items"][0]["id"] == idea["id"]
    deleted = client.delete(location, headers=headers)
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert client.get(location, headers=headers).status_code == 404


def test_user_isolation_for_every_operation(client, register_and_login):
    _, alice = register_and_login("alice@example.com")
    _, bob = register_and_login("bob@example.com")
    idea = client.post("/api/v1/ideas", headers=alice, json={"title": "Alice 的私密想法"}).json()
    path = f"/api/v1/ideas/{idea['id']}"
    assert client.get("/api/v1/ideas", headers=bob).json()["total"] == 0
    assert client.get(path, headers=bob).status_code == 404
    assert client.patch(path, headers=bob, json={"title": "窃取"}).status_code == 404
    assert client.delete(path, headers=bob).status_code == 404
    assert client.get(path, headers=alice).json()["title"] == "Alice 的私密想法"


def test_owner_cannot_be_spoofed(client, register_and_login):
    _, headers = register_and_login()
    response = client.post(
        "/api/v1/ideas", headers=headers, json={"title": "学习", "owner_id": str(uuid4())}
    )
    assert response.status_code == 422


def test_filter_and_pagination(client, register_and_login):
    _, headers = register_and_login()
    for index in range(3):
        response = client.post(
            "/api/v1/ideas",
            headers=headers,
            json={"title": str(index), "status": "archived" if index == 2 else "inbox"},
        )
        assert response.status_code == 201
    page = client.get("/api/v1/ideas?status=inbox&limit=1&offset=1", headers=headers).json()
    assert page["total"] == 2
    assert len(page["items"]) == 1
    assert page["limit"] == 1 and page["offset"] == 1
    assert page["items"][0]["status"] == "inbox"
    assert client.get("/api/v1/ideas?offset=10", headers=headers).json()["items"] == []


@pytest.mark.parametrize("query", ["limit=0", "limit=101", "offset=-1", "status=unknown"])
def test_invalid_list_parameters(client, register_and_login, query):
    _, headers = register_and_login()
    assert client.get(f"/api/v1/ideas?{query}", headers=headers).status_code == 422


@pytest.mark.parametrize(
    "patch", [{"title": " "}, {"title": None}, {"content": None}, {"status": "bad"}]
)
def test_invalid_patch(client, register_and_login, patch):
    _, headers = register_and_login()
    response = client.post("/api/v1/ideas", headers=headers, json={"title": "原始标题"})
    path = response.headers["location"]
    assert client.patch(path, headers=headers, json=patch).status_code == 422
    assert client.get(path, headers=headers).json()["title"] == "原始标题"


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_missing_idea(client, register_and_login, method):
    _, headers = register_and_login()
    kwargs = {"json": {"title": "不存在"}} if method == "patch" else {}
    assert (
        getattr(client, method)(f"/api/v1/ideas/{uuid4()}", headers=headers, **kwargs).status_code
        == 404
    )


def test_all_idea_routes_require_authentication(client):
    path = f"/api/v1/ideas/{uuid4()}"
    assert client.get("/api/v1/ideas").status_code == 401
    assert client.post("/api/v1/ideas", json={"title": "test"}).status_code == 401
    assert client.get(path).status_code == 401
    assert client.patch(path, json={"title": "test"}).status_code == 401
    assert client.delete(path).status_code == 401
