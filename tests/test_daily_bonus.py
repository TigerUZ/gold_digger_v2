from datetime import datetime, timedelta

from auth.router import (
    BONUS_COOLDOWN_SECONDS,
    BONUS_STREAK_RESET_SECONDS,
    _sync_daily_bonus,
)
from models import GameMechanic


def _mech(step: int = 0, last_taken: datetime | None = None) -> GameMechanic:
    return GameMechanic(
        user_id=1,
        daily_bonus_step=step,
        daily_bonus_last_taken_at=last_taken,
    )


def test_first_bonus_available_immediately():
    mech = _mech()

    can_claim, wait = _sync_daily_bonus(mech, datetime(2026, 5, 25, 12, 0, 0))

    assert can_claim is True
    assert wait == 0


def test_bonus_on_cooldown():
    taken = datetime(2026, 5, 25, 12, 0, 0)
    now = taken + timedelta(hours=2)
    mech = _mech(step=2, last_taken=taken)

    can_claim, wait = _sync_daily_bonus(mech, now)

    assert can_claim is False
    assert wait == BONUS_COOLDOWN_SECONDS - 2 * 60 * 60


def test_bonus_available_after_24_hours():
    taken = datetime(2026, 5, 24, 12, 0, 0)
    now = taken + timedelta(seconds=BONUS_COOLDOWN_SECONDS)
    mech = _mech(step=3, last_taken=taken)

    can_claim, wait = _sync_daily_bonus(mech, now)

    assert can_claim is True
    assert wait == 0


def test_streak_resets_after_48_hours():
    taken = datetime(2026, 5, 20, 12, 0, 0)
    now = taken + timedelta(seconds=BONUS_STREAK_RESET_SECONDS + 1)
    mech = _mech(step=5, last_taken=taken)

    can_claim, wait = _sync_daily_bonus(mech, now)

    assert mech.daily_bonus_step == 0
    assert can_claim is True
    assert wait == 0
