from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Record(Base):
    __tablename__ = "records"
    __table_args__ = (
        ForeignKeyConstraint(["owner_id", "tag_id"], ["tags.owner_id", "tags.id"]),
        CheckConstraint("minutes > 0 AND minutes <= 525600", name="positive_minutes"),
        CheckConstraint("started_at IS NULL OR started_at <= completed_at", name="time_order"),
        Index("ix_records_owner_completed", "owner_id", "completed_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    minutes: Mapped[float] = mapped_column(Float)
    tag_id: Mapped[str | None] = mapped_column(String(100))
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"))
    note: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
