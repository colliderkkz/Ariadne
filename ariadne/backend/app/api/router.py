from fastapi import APIRouter

from app.api.routes import auth, ideas, imports, llm, messages, projects, records, tags, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(ideas.router)

api_router.include_router(projects.router)
api_router.include_router(tags.router)
api_router.include_router(records.router)
api_router.include_router(messages.router)


api_router.include_router(llm.router)
api_router.include_router(imports.router)
