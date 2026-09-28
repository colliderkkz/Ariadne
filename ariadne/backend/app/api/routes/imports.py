from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.imports import LegacyImport
from app.services.imports import import_legacy

router = APIRouter(prefix="/imports", tags=["旧数据迁移"])


@router.post("/local-storage")
def import_local_storage(data: LegacyImport, db: DbSession, current_user: CurrentUser):
    return import_legacy(db, current_user.id, data)
