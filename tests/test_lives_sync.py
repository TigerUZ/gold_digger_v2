from datetime import datetime, timedelta

from auth.lives import MAX_LIVES, REGEN_SECONDS, sync_mole_lives
from models import GameMechanic


def _mech(mole_lives: int, last_at: datetime | None = None) -> GameMechanic:
    return GameMechanic(
        user_id=1,
        lives=mole_lives,
        mole_lives=mole_lives,
        mines_lives=MAX_LIVES,
        last_round_played_at=last_at,
        mole_last_round_played_at=last_at,
    )


def test_full_lives_returns_zero_timer():
    mech = _mech(MAX_LIVES)
    remaining = sync_mole_lives(mech, datetime(2026, 5, 25, 12, 0, 0))

    assert remaining == 0
    assert mech.mole_lives == MAX_LIVES
    assert mech.mole_last_round_played_at is None


def test_starts_regen_timer_when_below_max():
    now = datetime(2026, 5, 25, 12, 0, 0)
    mech = _mech(2, last_at=None)

    remaining = sync_mole_lives(mech, now)

    assert mech.mole_last_round_played_at == now
    assert remaining == REGEN_SECONDS


def test_regenerates_life_after_three_hours():
    started = datetime(2026, 5, 25, 9, 0, 0)
    now = started + timedelta(seconds=REGEN_SECONDS)
    mech = _mech(2, last_at=started)

    remaining = sync_mole_lives(mech, now)

    assert mech.mole_lives == MAX_LIVES
    assert remaining == 0


def test_regenerates_multiple_lives_when_elapsed_long_enough():
    started = datetime(2026, 5, 25, 0, 0, 0)
    now = started + timedelta(seconds=REGEN_SECONDS * 2 + 600)
    mech = _mech(1, last_at=started)

    remaining = sync_mole_lives(mech, now)

    assert mech.mole_lives == MAX_LIVES
    assert remaining == 0
