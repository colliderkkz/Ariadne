from uuid import UUID, uuid4

import pytest

from app.models import Project, ProjectMessage, Record, Tag


@pytest.fixture
def workspace(client, register_and_login):
    user, headers = register_and_login()
    tag = client.post("/api/v1/tags", headers=headers, json={"name": "摄影"}).json()
    idea = client.post(
        "/api/v1/ideas", headers=headers, json={"title": "学习摄影", "tag_ids": [tag["id"]]}
    ).json()
    project = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"title": "摄影项目", "linked_idea_id": idea["id"]},
    ).json()
    return user, headers, tag, idea, project


def payload(resource, tag, project):
    return {
        "projects": {"title": "新项目", "inner_thoughts": "先开始"},
        "tags": {"name": "新标签"},
        "records": {
            "title": "练习",
            "minutes": 20,
            "tag_id": tag["id"],
            "project_id": project["id"],
            "completed_at": "2026-09-26T10:00:00Z",
        },
        "messages": {"project_id": project["id"], "role": "user", "content": "今天拍了照片"},
    }[resource]


@pytest.mark.parametrize(
    "resource,model,field",
    [
        ("projects", Project, "title"),
        ("tags", Tag, "name"),
        ("records", Record, "title"),
        ("messages", ProjectMessage, "content"),
    ],
)
def test_persistent_crud_and_fresh_read(client, workspace, session_factory, resource, model, field):
    user, headers, tag, _, project = workspace
    response = client.post(
        f"/api/v1/{resource}", headers=headers, json=payload(resource, tag, project)
    )
    assert response.status_code == 201, response.text
    result = response.json()
    path = response.headers["location"]
    # 新 Session 直接查询 PostgreSQL；不能靠同一请求中的 Python 对象伪装持久化。
    with session_factory() as db:
        key = (UUID(user["id"]), result["id"]) if resource == "tags" else UUID(result["id"])
        assert db.get(model, key) is not None
    assert client.get(path, headers=headers).json() == result
    assert client.patch(path, headers=headers, json={field: "修改后"}).status_code == 200
    assert client.get(path, headers=headers).json()[field] == "修改后"
    assert client.delete(path, headers=headers).status_code == 204
    assert client.get(path, headers=headers).status_code == 404
    with session_factory() as db:
        assert db.get(model, key) is None


@pytest.mark.parametrize("resource", ["projects", "tags", "records", "messages"])
def test_isolation_every_resource(client, workspace, register_and_login, resource):
    _, alice, tag, _, project = workspace
    _, bob = register_and_login("other@example.com")
    path = client.post(
        f"/api/v1/{resource}", headers=alice, json=payload(resource, tag, project)
    ).headers["location"]
    assert client.get(path, headers=bob).status_code == 404
    assert client.patch(path, headers=bob, json={}).status_code == 404
    assert client.delete(path, headers=bob).status_code == 404
    assert client.get(path).status_code == 401
    assert (
        client.post(f"/api/v1/{resource}", json=payload(resource, tag, project)).status_code == 401
    )
    own_items = client.get(f"/api/v1/{resource}", headers=bob).json()["items"]
    assert path.rsplit("/", 1)[1] not in {item["id"] for item in own_items}


def test_foreign_links_cannot_be_spoofed(client, workspace, register_and_login):
    _, _, tag, idea, project = workspace
    _, bob = register_and_login("other@example.com")
    cases = [
        ("projects", {"title": "外部", "linked_idea_id": idea["id"]}),
        ("tags", {"name": "外部", "parent_id": tag["id"]}),
        ("ideas", {"title": "外部", "tag_ids": [tag["id"]]}),
        (
            "records",
            {
                "title": "外部",
                "minutes": 1,
                "completed_at": "2026-09-26T10:00:00Z",
                "project_id": project["id"],
            },
        ),
        ("messages", {"project_id": project["id"], "content": "外部"}),
    ]
    for resource, body in cases:
        assert client.post(f"/api/v1/{resource}", headers=bob, json=body).status_code == 404
    assert (
        client.get(f"/api/v1/messages?project_id={project['id']}", headers=bob).status_code == 404
    )


def test_project_conversion_archive_delete_relationships(client, workspace):
    _, headers, tag, idea, project = workspace
    idea_path = f"/api/v1/ideas/{idea['id']}"
    project_path = f"/api/v1/projects/{project['id']}"
    assert client.get(idea_path, headers=headers).json()["status"] == "convertedToProject"
    assert (
        client.post(
            "/api/v1/projects",
            headers=headers,
            json={"title": "重复", "linked_idea_id": idea["id"]},
        ).status_code
        == 409
    )
    message = client.post(
        "/api/v1/messages", headers=headers, json=payload("messages", tag, project)
    ).json()
    record = client.post(
        "/api/v1/records", headers=headers, json=payload("records", tag, project)
    ).json()
    assert client.patch(idea_path, headers=headers, json={"status": "archived"}).status_code == 200
    assert client.get(project_path, headers=headers).json()["status"] == "archived"
    assert client.delete(project_path, headers=headers).status_code == 204
    assert client.get(f"/api/v1/messages/{message['id']}", headers=headers).status_code == 404
    assert (
        client.get(f"/api/v1/records/{record['id']}", headers=headers).json()["project_id"] is None
    )


def test_tag_rules_and_atomic_unlink(client, workspace):
    _, headers, tag, idea, project = workspace
    assert client.delete("/api/v1/tags/learning", headers=headers).status_code == 403
    child = client.post(
        "/api/v1/tags", headers=headers, json={"name": "子标签", "parent_id": tag["id"]}
    ).json()
    assert client.delete(f"/api/v1/tags/{tag['id']}", headers=headers).status_code == 409
    assert (
        client.patch(
            f"/api/v1/tags/{tag['id']}", headers=headers, json={"parent_id": child["id"]}
        ).status_code
        == 422
    )
    assert client.delete(f"/api/v1/tags/{child['id']}", headers=headers).status_code == 204
    record = client.post(
        "/api/v1/records", headers=headers, json=payload("records", tag, project)
    ).json()
    assert client.delete(f"/api/v1/tags/{tag['id']}", headers=headers).status_code == 204
    assert client.get(f"/api/v1/ideas/{idea['id']}", headers=headers).json()["tag_ids"] == []
    assert client.get(f"/api/v1/records/{record['id']}", headers=headers).json()["tag_id"] is None


@pytest.mark.parametrize(
    "patch", [{"minutes": 0}, {"completed_at": "2020-01-01T00:00:00Z"}, {"title": None}]
)
def test_record_partial_validation(client, workspace, patch):
    _, headers, tag, _, project = workspace
    body = {**payload("records", tag, project), "started_at": "2026-09-26T09:40:00Z"}
    path = client.post("/api/v1/records", headers=headers, json=body).headers["location"]
    assert client.patch(path, headers=headers, json=patch).status_code == 422
    assert client.get(path, headers=headers).json()["minutes"] == 20


@pytest.mark.parametrize("resource", ["projects", "tags", "records", "messages"])
def test_pagination_and_ownership_fields_rejected(client, workspace, resource):
    _, headers, tag, _, project = workspace
    body = {**payload(resource, tag, project), "owner_id": str(uuid4())}
    assert client.post(f"/api/v1/{resource}", headers=headers, json=body).status_code == 422
    assert client.get(f"/api/v1/{resource}?limit=101", headers=headers).status_code == 422
    response = client.get(f"/api/v1/{resource}?limit=1", headers=headers).json()
    assert len(response["items"]) <= 1
