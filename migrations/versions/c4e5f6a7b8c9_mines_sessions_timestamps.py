"""mines_sessions created_at updated_at

Revision ID: c4e5f6a7b8c9
Revises: b2c3d4e5f6a7
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "mines_sessions",
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.add_column(
        "mines_sessions",
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("mines_sessions", "updated_at")
    op.drop_column("mines_sessions", "created_at")
