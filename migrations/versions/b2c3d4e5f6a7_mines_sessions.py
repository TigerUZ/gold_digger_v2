"""mines sessions table

Revision ID: b2c3d4e5f6a7
Revises: f1a2b3c4d5e6
Create Date: 2026-06-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mines_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("board", sa.Text(), nullable=False),
        sa.Column("opened", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("gold_in_session", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opens_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column("started_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_mines_sessions_user_id", "mines_sessions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_mines_sessions_user_id", table_name="mines_sessions")
    op.drop_table("mines_sessions")
