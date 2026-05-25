from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from aiogram.utils.web_app import WebAppInitData, safe_parse_webapp_init_data
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from config import config
from database import SessionDep
from models import GameMechanic, PendingReferral, Referral, User


async def verify_telegram_init_data(init_data_raw: str) -> WebAppInitData:
    try:
        validated_data = safe_parse_webapp_init_data(
            token=config.TOKEN,
            init_data=init_data_raw,
        )
        return validated_data
    except ValueError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Telegram initData")


def utcnow_naive() -> datetime:
    """UTC now without tzinfo (fits TIMESTAMP WITHOUT TIME ZONE)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_referral_code(start_param: str | None) -> str | None:
    if not start_param:
        return None
    code = start_param.strip()
    if code.startswith("ref_"):
        code = code[4:]
    return code or None


async def save_pending_referral(user_id: int, start_param: str, session: SessionDep) -> None:
    code = parse_referral_code(start_param)
    if not code:
        return

    existing = await session.get(PendingReferral, user_id)
    if existing:
        existing.referral_code = code
    else:
        session.add(PendingReferral(user_id=user_id, referral_code=code))
    await session.commit()


async def consume_pending_referral(user_id: int, session: SessionDep) -> str | None:
    pending = await session.get(PendingReferral, user_id)
    if not pending:
        return None
    code = pending.referral_code
    await session.delete(pending)
    await session.commit()
    return code


async def link_referral_by_code(
    code: str,
    new_user: User,
    session: SessionDep,
    game_mechanic: GameMechanic | None = None,
) -> None:
    if not code or code == new_user.referral_code:
        return

    existing_q = select(Referral).where(Referral.referral_user_id == new_user.id)
    if (await session.execute(existing_q)).scalar_one_or_none():
        return

    master_q = (
        select(User)
        .where(User.referral_code == code, User.is_deleted.is_(False))
        .options(selectinload(User.game_mechanic))
    )
    master = (await session.execute(master_q)).scalar_one_or_none()
    if not master or master.id == new_user.id:
        return

    referral = Referral(
        referral_master_id=master.id,
        referral_user_id=new_user.id,
        referral_gain_gold=config.REFERRAL_GOLD_QTY,
    )
    session.add(referral)

    if master.game_mechanic:
        master.game_mechanic.total_gold += config.REFERRAL_GOLD_QTY
        session.add(master.game_mechanic)

    if game_mechanic:
        game_mechanic.total_gold += config.REFERRAL_GOLD_QTY
        session.add(game_mechanic)


async def link_referral_if_applicable(
    user_data: WebAppInitData,
    new_user: User,
    session: SessionDep,
    game_mechanic: GameMechanic | None = None,
) -> None:
    code = parse_referral_code(user_data.start_param)
    if not code:
        code = await consume_pending_referral(new_user.id, session)
    if not code:
        return

    await link_referral_by_code(code, new_user, session, game_mechanic)


async def create_referral_code() -> str:
    return str(uuid4())


async def get_user_from_db(user_id: int, session: SessionDep):
    try:
        query = select(User).where(User.id == user_id).options(selectinload(User.game_mechanic))
        query_data = await session.execute(query)
        return query_data.scalar_one_or_none()
    except SQLAlchemyError as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load data from database",
        )


async def create_user_in_db(user_data: WebAppInitData, session: SessionDep) -> User:
    new_user = User(
        id=user_data.user.id,
        username=user_data.user.username,
        first_name=user_data.user.first_name,
        last_name=user_data.user.last_name,
        referral_code=await create_referral_code(),
    )

    new_game_mechanic = GameMechanic(
        user_id=new_user.id,
        user=new_user,
        lives=5,
        last_round_played_at=None,
    )

    try:
        session.add(new_user)
        session.add(new_game_mechanic)
        await link_referral_if_applicable(user_data, new_user, session, new_game_mechanic)
        await session.commit()
        await session.refresh(new_user)
    except SQLAlchemyError as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create new user",
        )

    return new_user
