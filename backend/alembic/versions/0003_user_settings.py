"""Add account profile, theme and encrypted model configuration."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "d013924cf7df"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("avatar", sa.Text(), nullable=True))
    op.add_column(
        "users", sa.Column("theme", sa.String(10), server_default="system", nullable=False)
    )
    op.add_column("users", sa.Column("llm_provider", sa.String(30), nullable=True))
    op.add_column("users", sa.Column("llm_model", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("llm_key_encrypted", sa.Text(), nullable=True))


def downgrade():
    for column in ("llm_key_encrypted", "llm_model", "llm_provider", "theme", "avatar"):
        op.drop_column("users", column)
