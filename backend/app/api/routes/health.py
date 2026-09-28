from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import DbSession

router = APIRouter(tags=["健康检查"])


@router.get("/health/live")
def liveness() -> dict[str, str]:
    """进程存活不依赖数据库，方便区分应用问题和数据库问题。"""
    return {"status": "ok"}


@router.get("/health/ready")
def readiness(db: DbSession) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="数据库暂时不可用") from exc
    return {"status": "ok", "database": "ok"}
