from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IdeaStatus(StrEnum):
    INBOX = "inbox"
    EXPLORING = "exploring"
    CONVERTED_TO_PROJECT = "convertedToProject"
    ARCHIVED = "archived"


class Idea(Base):
    __tablename__ = "ideas"
    __table_args__ = (Index("ix_ideas_owner_created", "owner_id", "created_at", "id"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="")
    # 暂存前端标签 ID；标签 CRUD 接入后可以进一步改为关联表。
    tag_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[IdeaStatus] = mapped_column(
        Enum(
            IdeaStatus,
            values_callable=lambda enum: [item.value for item in enum],
            native_enum=False,
            create_constraint=True,
            name="idea_status",
        ),
        default=IdeaStatus.INBOX,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
