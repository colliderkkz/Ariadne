from datetime import datetime
from typing import Annotated, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.models.idea import IdeaStatus

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
TagId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class IdeaCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title
    content: str = Field(default="", max_length=20000)
    tag_ids: list[TagId] = Field(default_factory=list, max_length=30)
    status: IdeaStatus = IdeaStatus.INBOX


class IdeaUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title | None = None
    content: str | None = Field(default=None, max_length=20000)
    tag_ids: list[TagId] | None = Field(default=None, max_length=30)
    status: IdeaStatus | None = None

    @model_validator(mode="after")
    def reject_explicit_null(self) -> Self:
        # PATCH 的“未传字段”表示保持原值，显式传 null 则不是合法的非空字段值。
        if any(getattr(self, name) is None for name in self.model_fields_set):
            raise ValueError("更新字段不能为 null；不修改的字段请省略")
        return self


class IdeaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    content: str
    tag_ids: list[str]
    status: IdeaStatus
    created_at: datetime
    updated_at: datetime


class IdeaPage(BaseModel):
    items: list[IdeaRead]
    total: int
    limit: int
    offset: int
