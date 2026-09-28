from typing import Literal

from pydantic import Field, SecretStr, field_validator

from app.schemas.resources import Content, Input, MessageRead


class ChatMessage(Input):
    role: Literal["user", "assistant"]
    content: Content


class Conversation(Input):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


class ChatRequest(Input):
    content: Content


class ChatReply(Input):
    user_message: MessageRead
    assistant_message: MessageRead


class LlmStatus(Input):
    configured: bool
    provider: str
    model: str
    base_url: str
    source: Literal["personal", "server"]


class LlmUpdate(Input):
    provider: Literal["deepseek", "openai", "moonshot", "siliconflow", "qwen"]
    model: str = Field(min_length=1, max_length=200)
    api_key: SecretStr | None = Field(default=None, max_length=4096)

    @field_validator("model")
    @classmethod
    def validate_model(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("请填写模型名称")
        return value
