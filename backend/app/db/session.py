from collections.abc import Generator

from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings


def create_session_factory(settings: Settings) -> sessionmaker[Session]:
    engine = create_engine(
        settings.database_url.get_secret_value(),
        pool_pre_ping=True,  # 从连接池取连接前检查有效性，处理数据库重启后的旧连接。
        connect_args={"connect_timeout": 5},
    )
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db(request: Request) -> Generator[Session, None, None]:
    """每个请求一个 Session；写入由业务层 commit，异常时统一 rollback。"""
    with request.app.state.session_factory() as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        # with 自动关闭 Session 并归还连接，不在这里隐式提交事务。
