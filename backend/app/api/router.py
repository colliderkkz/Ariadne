from fastapi import APIRouter

from app.api.routes import auth, ideas, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(ideas.router)
