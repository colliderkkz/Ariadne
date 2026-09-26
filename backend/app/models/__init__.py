# Alembic 必须导入全部模型，Base.metadata 才包含完整的建表信息。
from app.models.idea import Idea, IdeaStatus
from app.models.user import User

__all__ = ["Idea", "IdeaStatus", "User"]
