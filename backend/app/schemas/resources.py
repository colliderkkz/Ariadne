from datetime import datetime
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.models.project import ProjectStatus
from app.schemas.idea import Title

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Content = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20000)]


class Page[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Patch(Input):
    @model_validator(mode="after")
    def reject_invalid_null(self) -> Self:
        nullable = {"linked_idea_id", "parent_id", "tag_id", "project_id", "started_at"}
        if any(getattr(self, key) is None for key in self.model_fields_set - nullable):
            raise ValueError("此字段不能为 null；保持原值请省略字段")
        return self


class ProjectCreate(Input):
    title: Title
    description: str = Field(default="", max_length=20000)
    inner_thoughts: str = Field(default="", max_length=20000)
    status: ProjectStatus = ProjectStatus.ACTIVE
    linked_idea_id: UUID | None = None


class ProjectUpdate(Patch):
    title: Title | None = None
    description: str | None = Field(default=None, max_length=20000)
    inner_thoughts: str | None = Field(default=None, max_length=20000)
    status: ProjectStatus | None = None
    linked_idea_id: UUID | None = None


class ProjectRead(ProjectCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime


class TagCreate(Input):
    name: Name
    parent_id: Name | None = None


class TagUpdate(Patch):
    name: Name | None = None
    parent_id: Name | None = None


class TagRead(TagCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: Literal["system", "custom"]
    created_at: datetime
    updated_at: datetime


class RecordCreate(Input):
    title: Title
    minutes: float = Field(gt=0, le=525600, allow_inf_nan=False)
    tag_id: Name | None = None
    project_id: UUID | None = None
    note: str = Field(default="", max_length=20000)
    started_at: AwareDatetime | None = None
    completed_at: AwareDatetime

    @model_validator(mode="after")
    def validate_time_order(self) -> Self:
        if self.started_at and self.started_at > self.completed_at:
            raise ValueError("开始时间不能晚于完成时间")
        return self


class RecordUpdate(Patch):
    title: Title | None = None
    minutes: float | None = Field(default=None, gt=0, le=525600, allow_inf_nan=False)
    tag_id: Name | None = None
    project_id: UUID | None = None
    note: str | None = Field(default=None, max_length=20000)
    started_at: AwareDatetime | None = None
    completed_at: AwareDatetime | None = None


class RecordRead(RecordCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime


class MessageCreate(Input):
    project_id: UUID
    role: Literal["user", "assistant"] = "user"
    content: Content


class MessageUpdate(Patch):
    content: Content | None = None


class MessageRead(MessageCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime
