import base64
import binascii
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: DisplayName
    avatar: str | None = Field(default=None, max_length=350000)
    theme: Literal["system", "light", "dark"]

    @field_validator("avatar")
    @classmethod
    def validate_avatar(cls, value):
        if value is None:
            return value
        prefix, _, encoded = value.partition(",")
        if prefix not in (
            "data:image/png;base64",
            "data:image/jpeg;base64",
            "data:image/webp;base64",
        ):
            raise ValueError("头像须为 PNG、JPEG 或 WebP 图片")
        try:
            data = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error) as exc:
            raise ValueError("头像格式无效") from exc
        signatures = {
            "data:image/png;base64": data.startswith(b"\x89PNG\r\n\x1a\n"),
            "data:image/jpeg;base64": data.startswith(b"\xff\xd8\xff"),
            "data:image/webp;base64": data.startswith(b"RIFF") and data[8:12] == b"WEBP",
        }
        if not signatures[prefix] or len(data) > 250000:
            raise ValueError("头像格式无效或超过 250 KB")
        return value


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    display_name: DisplayName
    # 不对密码执行 strip/lower，用户输入的空格、大小写都是密码的一部分。
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        # 本项目约定账号邮箱不区分大小写；注册与登录必须采用相同规则。
        return value.lower()


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    display_name: str
    avatar: str | None
    theme: Literal["system", "light", "dark"]
    is_active: bool
    created_at: datetime
    # 响应模型采用白名单字段，永远不暴露 hashed_password。
