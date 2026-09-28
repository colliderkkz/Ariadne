from uuid import UUID

from fastapi import APIRouter

from app.api.deps import AppSettings, CurrentUser, DbSession
from app.schemas.llm import ChatReply, ChatRequest, Conversation, LlmStatus, LlmUpdate
from app.services import llm, model_settings

router = APIRouter(tags=["模型"])


@router.get("/llm/status", response_model=LlmStatus)
def status(current_user: CurrentUser, settings: AppSettings):
    return model_settings.status(settings, current_user)


@router.put("/llm/config", response_model=LlmStatus)
def save_config(data: LlmUpdate, current_user: CurrentUser, settings: AppSettings, db: DbSession):
    resolved = model_settings.effective(settings, current_user, data)
    current_user.llm_provider = resolved.llm_provider
    current_user.llm_model = resolved.llm_model
    current_user.llm_key_encrypted = (
        model_settings.cipher(settings)
        .encrypt(resolved.llm_api_key.get_secret_value().encode())
        .decode()
    )
    db.commit()
    return model_settings.status(settings, current_user)


@router.delete("/llm/config", response_model=LlmStatus)
def reset_config(current_user: CurrentUser, settings: AppSettings, db: DbSession):
    current_user.llm_provider = None
    current_user.llm_model = None
    current_user.llm_key_encrypted = None
    db.commit()
    return model_settings.status(settings, current_user)


@router.post("/llm/test")
def test_config(data: LlmUpdate, current_user: CurrentUser, settings: AppSettings):
    resolved = model_settings.effective(settings, current_user, data)
    llm.complete(resolved, "简短回复 OK。", [{"role": "user", "content": "连接测试"}])
    return {"message": "连接成功，模型已响应。"}


@router.post("/llm/explore")
def explore(data: Conversation, current_user: CurrentUser, settings: AppSettings):
    return {
        "content": llm.complete(
            model_settings.effective(settings, current_user),
            llm.EXPLORE_PROMPT,
            [item.model_dump() for item in data.messages],
        )
    }


@router.post("/llm/organize")
def organize(data: Conversation, current_user: CurrentUser, settings: AppSettings):
    return llm.organize(
        model_settings.effective(settings, current_user),
        [item.model_dump() for item in data.messages],
    )


@router.post("/projects/{project_id}/chat", response_model=ChatReply)
def chat(
    project_id: UUID,
    data: ChatRequest,
    db: DbSession,
    current_user: CurrentUser,
    settings: AppSettings,
):
    return llm.project_chat(
        db,
        current_user.id,
        project_id,
        data.content,
        model_settings.effective(settings, current_user),
    )
