from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from database import SessionDep
from models import GameMechanic, Referral, User
from auth.bot_info import build_referral_link, get_bot_username
from auth.schemas import UserSchema
from auth.utils import (
    create_referral_code,
    create_user_in_db,
    get_user_from_db,
    utcnow_naive,
    verify_telegram_init_data,
)


router = APIRouter()

# Game / energy rules
MAX_LIVES = 3
REGEN_SECONDS = 3 * 60 * 60  # 3 hours

# Daily bonus
DAILY_BONUS_REWARDS = [10, 15, 20, 25, 30, 35, 40]
BONUS_COOLDOWN_SECONDS = 24 * 60 * 60
BONUS_STREAK_RESET_SECONDS = 48 * 60 * 60


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


def _sync_daily_bonus(mech: GameMechanic, now: datetime) -> tuple[bool, int]:
    """Return whether bonus can be claimed and seconds until next claim."""
    now = _to_naive_utc(now) or utcnow_naive()
    last_taken = _to_naive_utc(mech.daily_bonus_last_taken_at)

    if last_taken is None:
        return True, 0

    elapsed = (now - last_taken).total_seconds()
    if elapsed >= BONUS_STREAK_RESET_SECONDS:
        mech.daily_bonus_step = 0

    if elapsed >= BONUS_COOLDOWN_SECONDS:
        return True, 0

    return False, int(BONUS_COOLDOWN_SECONDS - elapsed)


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


class DailyBonusResponse(BaseModel):
    rewards: list[int]
    step: int
    can_claim: bool
    next_claim_in_seconds: int


class DailyBonusClaimResponse(BaseModel):
    gold_awarded: int
    step: int
    total_gold: int
    can_claim: bool
    next_claim_in_seconds: int


class ReferralItem(BaseModel):
    name: str
    gold: int
    joined_at: str


class FriendsResponse(BaseModel):
    referral_link: str
    invited_count: int
    total_earned: int
    referrals: list[ReferralItem]


class WalletResponse(BaseModel):
    balance: int
    games_played: int
    best_score: int
    lives: int
    max_lives: int
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


async def _start_mole_round(request: Request, session: SessionDep) -> StartRoundResponse:
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


@router.post("/mole/start", response_model=StartRoundResponse)
async def mole_start(request: Request, session: SessionDep):
    return await _start_mole_round(request, session)


@router.post("/game/start", response_model=StartRoundResponse)
async def game_start(request: Request, session: SessionDep):
    return await _start_mole_round(request, session)


async def _finish_mole_round(request: Request, payload: FinishRoundRequest, session: SessionDep):
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


@router.post("/mole/finish")
async def mole_finish(request: Request, payload: FinishRoundRequest, session: SessionDep):
    return await _finish_mole_round(request, payload, session)


@router.post("/game/finish")
async def game_finish(request: Request, payload: FinishRoundRequest, session: SessionDep):
    return await _finish_mole_round(request, payload, session)


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


@router.get("/daily-bonus", response_model=DailyBonusResponse)
async def daily_bonus_status(request: Request, session: SessionDep):
    _, mech, _ = await _get_current_user(request, session)
    now = utcnow_naive()
    can_claim, next_in = _sync_daily_bonus(mech, now)
    session.add(mech)
    await session.commit()

    return DailyBonusResponse(
        rewards=DAILY_BONUS_REWARDS,
        step=mech.daily_bonus_step,
        can_claim=can_claim,
        next_claim_in_seconds=next_in,
    )


@router.post("/daily-bonus/claim", response_model=DailyBonusClaimResponse)
async def daily_bonus_claim(request: Request, session: SessionDep):
    _, mech, _ = await _get_current_user(request, session)
    now = utcnow_naive()
    can_claim, next_in = _sync_daily_bonus(mech, now)

    if not can_claim:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Bonus not ready yet", "next_claim_in_seconds": next_in},
        )

    reward_index = min(mech.daily_bonus_step, len(DAILY_BONUS_REWARDS) - 1)
    gold_awarded = DAILY_BONUS_REWARDS[reward_index]

    mech.total_gold += gold_awarded
    mech.daily_bonus_last_taken_at = now
    mech.daily_bonus_step = (mech.daily_bonus_step + 1) % len(DAILY_BONUS_REWARDS)

    session.add(mech)
    await session.commit()

    return DailyBonusClaimResponse(
        gold_awarded=gold_awarded,
        step=mech.daily_bonus_step,
        total_gold=mech.total_gold,
        can_claim=False,
        next_claim_in_seconds=BONUS_COOLDOWN_SECONDS,
    )


@router.get("/public/bot")
async def public_bot_info():
    username = await get_bot_username()
    return {
        "bot_username": username,
        "telegram_url": f"https://t.me/{username}" if username else "",
    }


@router.get("/friends", response_model=FriendsResponse)
async def friends(request: Request, session: SessionDep):
    user, _, _ = await _get_current_user(request, session)

    if not user.referral_code:
        user.referral_code = await create_referral_code()
        session.add(user)
        await session.commit()

    referrals_q = (
        select(Referral, User)
        .join(User, Referral.referral_user_id == User.id)
        .where(Referral.referral_master_id == user.id)
        .order_by(Referral.created_at.desc())
    )
    rows = (await session.execute(referrals_q)).all()

    referral_items = []
    total_earned = 0
    for referral, invited_user in rows:
        total_earned += referral.referral_gain_gold
        name = invited_user.first_name
        if invited_user.username:
            name = f"@{invited_user.username}"
        referral_items.append(
            ReferralItem(
                name=name,
                gold=referral.referral_gain_gold,
                joined_at=referral.created_at.isoformat() if referral.created_at else "",
            )
        )

    return FriendsResponse(
        referral_link=await build_referral_link(user.referral_code),
        invited_count=len(referral_items),
        total_earned=total_earned,
        referrals=referral_items,
    )


@router.get("/wallet", response_model=WalletResponse)
async def wallet(request: Request, session: SessionDep):
    user, mech, _ = await _get_current_user(request, session)

    referral_sum_q = select(func.coalesce(func.sum(Referral.referral_gain_gold), 0)).where(
        Referral.referral_master_id == user.id
    )
    referral_sum = (await session.execute(referral_sum_q)).scalar_one()

    return WalletResponse(
        balance=mech.total_gold,
        games_played=mech.rounds_played,
        best_score=mech.best_round_gold,
        lives=mech.lives,
        max_lives=MAX_LIVES,
        referral_earned=int(referral_sum),
    )
