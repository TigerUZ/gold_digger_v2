from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from database import SessionDep
from models import GameMechanic, Referral, User
from auth.schemas import UserSchema
from auth.utils import (
    create_user_in_db,
    get_user_from_db,
    utcnow_naive,
    verify_telegram_init_data,
)


router = APIRouter()

# Game / energy rules
MAX_LIVES = 5
REGEN_SECONDS = 3 * 60 * 60  # 3 hours


def _to_naive_utc(dt: datetime | None) -> datetime | None:
    """Normalize datetimes so we never subtract aware vs naive."""
    if dt is None:
        return None
    if dt.tzinfo is not None and dt.utcoffset() is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _sync_lives(mech: GameMechanic, now: datetime) -> int:
    """Synchronize lives and return seconds until next life (0 if none)."""
    now = _to_naive_utc(now) or utcnow_naive()
    mech.last_round_played_at = _to_naive_utc(mech.last_round_played_at)

    # Full lives: stop timer
    if mech.lives >= MAX_LIVES:
        mech.lives = MAX_LIVES
        mech.last_round_played_at = None
        return 0

    # Timer not running but not full -> start timer from now (safety)
    if mech.last_round_played_at is None:
        mech.last_round_played_at = now

    elapsed = (now - mech.last_round_played_at).total_seconds()
    if elapsed < 0:
        elapsed = 0

    gained = int(elapsed // REGEN_SECONDS)
    if gained > 0:
        mech.lives = min(MAX_LIVES, mech.lives + gained)
        mech.last_round_played_at = mech.last_round_played_at + timedelta(seconds=gained * REGEN_SECONDS)
        if mech.lives >= MAX_LIVES:
            mech.lives = MAX_LIVES
            mech.last_round_played_at = None
            return 0
        elapsed = (now - mech.last_round_played_at).total_seconds()

    remaining = REGEN_SECONDS - (elapsed % REGEN_SECONDS)
    return int(max(0, remaining))


def _get_init_data_from_headers(request: Request) -> str:
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-Telegram-Init-Data header")
    return init_data


async def _get_current_user(request: Request, session: SessionDep) -> tuple[User, GameMechanic, int]:
    init_data = _get_init_data_from_headers(request)
    data = await verify_telegram_init_data(init_data)
    if data.user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Telegram initData")

    user = await get_user_from_db(data.user.id, session)
    if not user:
        user = await create_user_in_db(data, session)
        # re-load with relationships
        user = await get_user_from_db(data.user.id, session)
        if not user:
            raise HTTPException(status_code=500, detail="Failed to create user")

    mech = user.game_mechanic
    if mech is None:
        # safety: create mechanic if missing
        mech = GameMechanic(user_id=user.id, lives=MAX_LIVES)
        session.add(mech)
        await session.commit()
        await session.refresh(user)
        user = await get_user_from_db(user.id, session)
        mech = user.game_mechanic

    next_life_in = _sync_lives(mech, utcnow_naive())
    session.add(mech)
    await session.commit()
    return user, mech, next_life_in


class AuthRequest(BaseModel):
    initData: str = Field(..., description="Telegram WebApp initData")


class MeResponse(BaseModel):
    user: UserSchema
    max_lives: int
    next_life_in_seconds: int


class StartRoundResponse(BaseModel):
    lives: int
    max_lives: int
    next_life_in_seconds: int


class FinishRoundRequest(BaseModel):
    score: int = Field(ge=0, le=1000)


class EarningsResponse(BaseModel):
    gold_earned: int
    games_played: int
    best_score: int
    last_played: str | None
    referral_earned: int


@router.post("/auth/webapp", response_model=UserSchema)
async def auth_webapp(payload: AuthRequest, session: SessionDep):
    data = await verify_telegram_init_data(payload.initData)
    if data.user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Telegram initData")

    user = await get_user_from_db(data.user.id, session)
    if not user:
        await create_user_in_db(data, session)
        user = await get_user_from_db(data.user.id, session)
        if not user:
            raise HTTPException(status_code=500, detail="Failed to create user")

    mech = user.game_mechanic
    if mech is None:
        mech = GameMechanic(user_id=user.id, lives=MAX_LIVES)
        session.add(mech)
        await session.commit()
        user = await get_user_from_db(user.id, session)
        mech = user.game_mechanic

    _sync_lives(mech, utcnow_naive())
    session.add(mech)
    await session.commit()

    # IMPORTANT: UserSchema no longer includes lazy relationships that would cause MissingGreenlet
    return UserSchema.model_validate(user)


@router.get("/me", response_model=MeResponse)
async def me(request: Request, session: SessionDep):
    user, mech, next_life_in = await _get_current_user(request, session)
    return MeResponse(user=UserSchema.model_validate(user), max_lives=MAX_LIVES, next_life_in_seconds=next_life_in)


@router.post("/game/start", response_model=StartRoundResponse)
async def game_start(request: Request, session: SessionDep):
    user, mech, next_life_in = await _get_current_user(request, session)

    if mech.lives <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "No lives left", "next_life_in_seconds": next_life_in},
        )

    # Spend 1 life
    was_full = mech.lives >= MAX_LIVES
    mech.lives -= 1

    # Start regen timer when we go from full -> not full
    if was_full and mech.last_round_played_at is None:
        mech.last_round_played_at = utcnow_naive()

    next_life_in = _sync_lives(mech, utcnow_naive())
    session.add(mech)
    await session.commit()

    return StartRoundResponse(lives=mech.lives, max_lives=MAX_LIVES, next_life_in_seconds=next_life_in)


@router.post("/game/finish")
async def game_finish(request: Request, payload: FinishRoundRequest, session: SessionDep):
    user, mech, _ = await _get_current_user(request, session)
    score = int(payload.score)

    mech.total_gold += score
    mech.rounds_played += 1
    if score > mech.best_round_gold:
        mech.best_round_gold = score

    session.add(mech)
    await session.commit()

    return {
        "ok": True,
        "total_gold": mech.total_gold,
        "rounds_played": mech.rounds_played,
        "best_round_gold": mech.best_round_gold,
    }


@router.get("/earnings", response_model=EarningsResponse)
async def earnings(request: Request, session: SessionDep):
    user, mech, _ = await _get_current_user(request, session)

    referral_sum_q = select(func.coalesce(func.sum(Referral.referral_gain_gold), 0)).where(
        Referral.referral_master_id == user.id
    )
    referral_sum = (await session.execute(referral_sum_q)).scalar_one()

    last_played = mech.last_round_played_at.isoformat() if mech.last_round_played_at else None

    return EarningsResponse(
        gold_earned=mech.total_gold,
        games_played=mech.rounds_played,
        best_score=mech.best_round_gold,
        last_played=last_played,
        referral_earned=int(referral_sum),
    )
