import pytest
from pydantic import ValidationError
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.db.session import get_db


def test_health_checks(client):
    assert client.get("/health/live").json() == {"status": "ok"}
    assert client.get("/health/ready").json() == {"status": "ok", "database": "ok"}


def test_readiness_returns_503_without_leaking_connection_details(client):
    class UnavailableSession:
        def execute(self, statement):
            raise OperationalError("secret-connection-string", {}, Exception("offline"))

    client.app.dependency_overrides[get_db] = lambda: UnavailableSession()
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert "secret-connection-string" not in response.text
    assert client.get("/health/live").status_code == 200


def test_cors_only_allows_configured_frontend(client):
    for origin, allowed in [("http://localhost:5173", True), ("https://unknown.example", False)]:
        response = client.options(
            "/api/v1/ideas",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        assert response.status_code == (200 if allowed else 400)
        assert (response.headers.get("access-control-allow-origin") == origin) is allowed


def test_openapi_documents_login_and_protected_routes(client):
    schema = client.get("/openapi.json").json()
    flow = schema["components"]["securitySchemes"]["OAuth2PasswordBearer"]["flows"]["password"]
    assert flow["tokenUrl"] == "/api/v1/auth/login"
    assert schema["paths"]["/api/v1/users/me"]["get"]["security"]
    assert "hashed_password" not in schema["components"]["schemas"]["UserRead"]["properties"]


@pytest.mark.parametrize(
    "changes",
    [
        {"jwt_secret_key": "short"},
        {"database_url": "sqlite://"},
        {"database_url": "not-a-url"},
        {"cors_origins": ["*"]},
    ],
)
def test_configuration_rejects_invalid_values(settings, changes):
    values = settings.model_dump()
    values.update(changes)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **values)
