"""Account-scoped configuration; provider endpoints cannot target arbitrary servers."""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from pydantic import SecretStr

PROVIDERS = {
    "deepseek": "https://api.deepseek.com/chat/completions",
    "openai": "https://api.openai.com/v1/chat/completions",
    "moonshot": "https://api.moonshot.cn/v1/chat/completions",
    "siliconflow": "https://api.siliconflow.cn/v1/chat/completions",
    "qwen": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
}


def cipher(settings):
    secret = settings.jwt_secret_key.get_secret_value().encode()
    return Fernet(
        base64.urlsafe_b64encode(hashlib.sha256(b"ariadne-llm-key-v1:" + secret).digest())
    )


def effective(settings, user, data=None):
    if data is None and not user.llm_provider:
        return settings
    provider = data.provider if data else user.llm_provider
    model = data.model if data else user.llm_model
    key = data.api_key.get_secret_value().strip() if data and data.api_key else ""
    if not key and user.llm_key_encrypted and provider == user.llm_provider:
        try:
            key = cipher(settings).decrypt(user.llm_key_encrypted.encode()).decode()
        except InvalidToken as exc:
            raise HTTPException(409, "密钥已失效，请重新填写 API Key") from exc
    if not key:
        raise HTTPException(422, "请填写该服务商的 API Key")
    return settings.model_copy(
        update={
            "llm_provider": provider,
            "llm_model": model,
            "llm_base_url": PROVIDERS[provider],
            "llm_api_key": SecretStr(key),
        }
    )


def status(settings, user):
    # Status remains readable even after a server secret rotation, so keys can be replaced.
    return {
        "configured": bool(user.llm_key_encrypted)
        if user.llm_provider
        else bool(settings.llm_api_key and settings.llm_api_key.get_secret_value().strip()),
        "provider": user.llm_provider or settings.llm_provider,
        "model": user.llm_model or settings.llm_model,
        "base_url": PROVIDERS[user.llm_provider] if user.llm_provider else settings.llm_base_url,
        "source": "personal" if user.llm_provider else "server",
    }
