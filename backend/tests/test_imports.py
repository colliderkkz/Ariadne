from copy import deepcopy


def legacy_data():
    times = {"created_at": "2026-09-20T00:00:00Z", "updated_at": "2026-09-20T00:00:00Z"}
    return {
        "tags": [{"id": "old-tag", "name": "摄影", "type": "custom", **times}],
        "ideas": [{"id": "old-idea", "title": "想法", "tag_ids": ["old-tag"], **times}],
        "projects": [{"id": "old-project", "title": "项目", "linked_idea_id": "old-idea", **times}],
        "records": [
            {
                "id": "old-record",
                "title": "记录",
                "minutes": 10,
                "project_id": "old-project",
                "tag_id": "old-tag",
                "completed_at": times["created_at"],
            }
        ],
        "messages": [
            {
                "id": "old-message",
                "project_id": "old-project",
                "role": "user",
                "content": "消息",
                "created_at": times["created_at"],
            }
        ],
    }


def test_import_atomic_idempotent_and_account_scoped(client, register_and_login):
    _, headers = register_and_login()
    body = legacy_data()
    first = client.post("/api/v1/imports/local-storage", headers=headers, json=body)
    assert first.status_code == 200, first.text
    assert first.json()["imported"] == dict.fromkeys(body, 1)
    assert client.post("/api/v1/imports/local-storage", headers=headers, json=body).json()[
        "imported"
    ] == dict.fromkeys(body, 0)
    assert client.get("/api/v1/ideas", headers=headers).json()["total"] == 1
    _, other = register_and_login("other@example.com")
    assert client.post("/api/v1/imports/local-storage", headers=other, json=body).status_code == 200
    first_id = client.get("/api/v1/ideas", headers=headers).json()["items"][0]["id"]
    other_id = client.get("/api/v1/ideas", headers=other).json()["items"][0]["id"]
    assert first_id != other_id


def test_failed_import_keeps_database_unchanged(client, register_and_login):
    _, headers = register_and_login()
    body = deepcopy(legacy_data())
    body["messages"][0]["project_id"] = "missing"
    assert (
        client.post("/api/v1/imports/local-storage", headers=headers, json=body).status_code == 404
    )
    for resource in ["ideas", "projects", "records", "messages"]:
        assert client.get(f"/api/v1/{resource}", headers=headers).json()["total"] == 0
    assert client.get("/api/v1/tags/old-tag", headers=headers).status_code == 404
