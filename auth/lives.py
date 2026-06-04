from __future__ import annotations

from datetime import datetime, timedelta, timezone

from models import GameMechanic

MAX_LIVES = 3
REGEN_SECONDS = 3 * 60 * 60


def _to_naive_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is not None and dt.utcoffset() is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _sync_lives_field(
    mech: GameMechanic,
    now: datetime,
    *,
    lives_attr: str,
    timer_attr: str,
) -> int:
    if now.tzinfo is not None and now.utcoffset() is not None:
        now = now.astimezone(timezone.utc).replace(tzinfo=None)
    lives = getattr(mech, lives_attr)
    timer = _to_naive_utc(getattr(mech, timer_attr))

    if lives >= MAX_LIVES:
        setattr(mech, lives_attr, MAX_LIVES)
        setattr(mech, timer_attr, None)
        return 0

    if timer is None:
        timer = now
        setattr(mech, timer_attr, timer)

    elapsed = (now - timer).total_seconds()
    if elapsed < 0:
        elapsed = 0

    gained = int(elapsed // REGEN_SECONDS)
    if gained > 0:
        lives = min(MAX_LIVES, lives + gained)
        timer = timer + timedelta(seconds=gained * REGEN_SECONDS)
        setattr(mech, lives_attr, lives)
        setattr(mech, timer_attr, timer)
        if lives >= MAX_LIVES:
            setattr(mech, lives_attr, MAX_LIVES)
            setattr(mech, timer_attr, None)
            return 0
        elapsed = (now - timer).total_seconds()

    remaining = REGEN_SECONDS - (elapsed % REGEN_SECONDS)
    return int(max(0, remaining))


def sync_mole_lives(mech: GameMechanic, now: datetime) -> int:
    return _sync_lives_field(mech, now, lives_attr="mole_lives", timer_attr="mole_last_round_played_at")


def sync_mines_lives(mech: GameMechanic, now: datetime) -> int:
    return _sync_lives_field(mech, now, lives_attr="mines_lives", timer_attr="mines_last_round_played_at")


def sync_all_lives(mech: GameMechanic, now: datetime) -> tuple[int, int]:
    mole_next = sync_mole_lives(mech, now)
    mines_next = sync_mines_lives(mech, now)
    return mole_next, mines_next
