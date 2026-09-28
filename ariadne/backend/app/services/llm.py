import json

import httpx
from fastapi import HTTPException
from sqlalchemy import select

from app.models import Project, ProjectMessage
from app.schemas.resources import MessageRead
from app.services.common import owned

EXPLORE_PROMPT = (
    "你是 Ariadne 的想法引导伙伴。通过自然对话帮助用户发现值得尝试的方向。"
    "语气温和、具体、不评判；每次只追问一个最有帮助的问题。信息足够时，给出 1—3 个"
    "轻量、可在今天开始的想法，不要替用户做长期计划。用简洁中文回复，控制在 180 字内。"
)
ORGANIZE_PROMPT = (
    "你是 Ariadne 的想法整理助手。将对话整理为严格 JSON："
    '{"title":"简洁标题","content":"项目内容介绍"}。'
    "标题 8—22 个中文字符，内容 2—4 句话。保留原意，不虚构目标、时间、资源或承诺。"
)


def complete(settings, system: str, messages: list[dict], temperature=0.7) -> str:
    key = settings.llm_api_key.get_secret_value() if settings.llm_api_key else ""
    if not key.strip():
        raise HTTPException(503, "模型尚未配置，请在我的设置中填写 API 配置")
    try:
        # 使用服务端解析后的账号配置；不接受对话请求中的 URL 或 system prompt。
        with httpx.Client(timeout=settings.llm_timeout_seconds, follow_redirects=False) as client:
            response = client.post(
                settings.llm_base_url,
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": settings.llm_model,
                    "messages": [{"role": "system", "content": system}, *messages],
                    "temperature": temperature,
                },
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            if not isinstance(content, str) or not content.strip() or len(content) > 20000:
                raise ValueError("invalid model response")
            return content.strip()
    except httpx.TimeoutException as exc:
        raise HTTPException(504, "模型响应超时，请稍后重试") from exc
    except httpx.HTTPStatusError as exc:
        detail = {
            401: "API Key 无效或已过期，请检查后重试",
            403: "服务商拒绝访问，请检查密钥权限和模型权限",
            404: "未找到模型或接口，请检查模型名称",
            429: "服务商额度不足或请求过于频繁，请检查额度后重试",
        }.get(exc.response.status_code, "模型服务暂时不可用，请稍后重试")
        # 使用 502，避免上游 401 被前端误认为本站登录过期。
        raise HTTPException(502, detail) from exc
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as exc:
        # 上游错误可能带出认证信息，不把原始响应或异常字符串返回浏览器。
        raise HTTPException(502, "模型服务暂时不可用，请稍后重试") from exc


def organize(settings, messages):
    answer = complete(settings, ORGANIZE_PROMPT, messages, temperature=0.2)
    try:
        start, end = answer.index("{"), answer.rindex("}")
        value = json.loads(answer[start : end + 1])
        if not isinstance(value.get("title"), str) or not isinstance(value.get("content"), str):
            raise ValueError("invalid draft")
        title, content = value["title"].strip()[:200], value["content"].strip()
        if not title or not content or len(content) > 20000:
            raise ValueError("empty draft")
        return {"title": title, "content": content}
    except (ValueError, AttributeError, TypeError) as exc:
        raise HTTPException(502, "模型返回的想法格式无效，请重试") from exc


def project_chat(db, owner_id, project_id, content, settings):
    project = owned(db, Project, owner_id, project_id, lock=True)
    history = db.scalars(
        select(ProjectMessage)
        .where(ProjectMessage.owner_id == owner_id, ProjectMessage.project_id == project_id)
        .order_by(ProjectMessage.created_at.desc(), ProjectMessage.id.desc())
        .limit(40)
    ).all()
    prompt = (
        f"你是 Ariadne 的项目推进伙伴。项目：{project.title}；说明：{project.description}。"
        "帮助用户回顾进展、澄清卡点并决定一个最小下一步。简洁中文回复，不超过 160 字。"
    )
    answer = complete(
        settings,
        prompt,
        [
            *[{"role": item.role, "content": item.content} for item in reversed(history)],
            {"role": "user", "content": content},
        ],
    )
    # 成功后成对写入同一事务；失败不产生半条对话，输入仍由前端保留以便重试。
    from datetime import UTC, datetime, timedelta

    now = datetime.now(UTC)
    user_message = ProjectMessage(
        owner_id=owner_id, project_id=project_id, role="user", content=content, created_at=now
    )
    assistant_message = ProjectMessage(
        owner_id=owner_id,
        project_id=project_id,
        role="assistant",
        content=answer,
        created_at=now + timedelta(microseconds=1),
    )
    db.add_all([user_message, assistant_message])
    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)
    return {
        "user_message": MessageRead.model_validate(user_message),
        "assistant_message": MessageRead.model_validate(assistant_message),
    }
