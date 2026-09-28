from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.api.routes.health import router as health_router
from app.core.config import Settings
from app.core.errors import (
    EmailAlreadyRegisteredError,
    IdeaNotFoundError,
    InvalidCredentialsError,
)
from app.db.session import create_session_factory


def create_app(settings: Settings | None = None) -> FastAPI:
    """应用工厂便于测试替换配置，避免 import 时读取密钥或连接数据库。"""
    settings = settings if settings is not None else Settings()
    session_factory = create_session_factory(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            yield
        finally:
            session_factory.kw["bind"].dispose()

    app = FastAPI(
        title="Ariadne API",
        version="0.1.0",
        description="FastAPI + SQLAlchemy + PostgreSQL 学习后端。登录表单 username 填邮箱。",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.session_factory = session_factory
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,  # 通过 Authorization 头传令牌，本阶段不使用 Cookie。
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Location"],
    )

    @app.exception_handler(EmailAlreadyRegisteredError)
    async def email_conflict(request: Request, exc: EmailAlreadyRegisteredError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": "该邮箱已注册"})

    @app.exception_handler(InvalidCredentialsError)
    async def invalid_credentials(request: Request, exc: InvalidCredentialsError) -> JSONResponse:
        return JSONResponse(
            status_code=401,
            content={"detail": "邮箱或密码错误，或账号不可用"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    @app.exception_handler(IdeaNotFoundError)
    async def idea_not_found(request: Request, exc: IdeaNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": "想法不存在"})

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        # FastAPI 默认验证错误可能附带原始输入；移除 input/ctx，避免回显密码。
        errors = [
            {"type": error["type"], "loc": error["loc"], "msg": error["msg"]}
            for error in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": errors})

    app.include_router(health_router)
    app.include_router(api_router)
    return app
