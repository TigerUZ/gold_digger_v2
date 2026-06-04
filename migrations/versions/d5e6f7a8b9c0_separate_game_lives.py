"""separate mole and mines lives

Revision ID: d5e6f7a8b9c0
Revises: c4e5f6a7b8c9
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "game_mechanics",
        sa.Column("mole_lives", sa.Integer(), server_default="3", nullable=False),
    )
    op.add_column(
        "game_mechanics",
        sa.Column("mines_lives", sa.Integer(), server_default="3", nullable=False),
    )
    op.add_column(
        "game_mechanics",
        sa.Column("mole_last_round_played_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "game_mechanics",
        sa.Column("mines_last_round_played_at", sa.DateTime(), nullable=True),
    )
    op.execute(
        """
        UPDATE game_mechanics
        SET mole_lives = lives,
            mines_lives = lives,
            mole_last_round_played_at = last_round_played_at,
            mines_last_round_played_at = last_round_played_at
        """
    )


def downgrade() -> None:
    op.drop_column("game_mechanics", "mines_last_round_played_at")
    op.drop_column("game_mechanics", "mole_last_round_played_at")
    op.drop_column("game_mechanics", "mines_lives")
    op.drop_column("game_mechanics", "mole_lives")
