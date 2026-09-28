from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, String, Text, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    display_name: Mapped[str] = mapped_column(String(80))
    avatar: Mapped[str | None] = mapped_column(Text)
    theme: Mapped[str] = mapped_column(String(10), default="system", server_default="system")
    llm_provider: Mapped[str | None] = mapped_column(String(30))
    llm_model: Mapped[str | None] = mapped_column(String(200))
    llm_key_encrypted: Mapped[str | None] = mapped_column(Text)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
