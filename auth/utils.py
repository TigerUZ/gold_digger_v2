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
from models import GameMechanic, User


# verification of telegram user
async def verify_telegram_init_data(init_data_raw: str) -> WebAppInitData:
    try:
        validated_data = safe_parse_webapp_init_data(
            token=config.TOKEN,
            init_data=init_data_raw
        )
        return validated_data
    except ValueError:
        # IMPORTANT: return proper HTTP error instead of silently returning None
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Telegram initData")


def utcnow_naive() -> datetime:
    """UTC now without tzinfo (fits TIMESTAMP WITHOUT TIME ZONE)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# creation of referral code
async def create_referral_code() -> str:
    return str(uuid4())


# looking for user in database
async def get_user_from_db(user_id: int, session: SessionDep):
    try:
        # eager-load game_mechanic to avoid MissingGreenlet in async
        query = select(User).where(User.id == user_id).options(selectinload(User.game_mechanic))
        query_data = await session.execute(query)
        user_data = query_data.scalar_one_or_none()

        return user_data
    except SQLAlchemyError as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not load data from database")


# creating new user
async def create_user_in_db(user_data: WebAppInitData, session: SessionDep) -> User:
    new_user = User(
        id=user_data.user.id,
        username=user_data.user.username,
        first_name=user_data.user.first_name,
        last_name=user_data.user.last_name,
        referral_code=await create_referral_code()
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
        await session.commit()
        # Reload with relationships
        await session.refresh(new_user)
    except SQLAlchemyError as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create new user")

    return new_user

    # # parsing query string
    # parsed = parse_qs(init_data, keep_blank_values=True)
    # data_dict = {k: v[0] for k, v in parsed.items()}
    # hash_received = data_dict.pop("hash", None)
    #
    # # building string for checking
    # data_check_arr = [f"{k}={v}" for k, v in sorted(data_dict.items())]
    # data_check_string = "\n".join(data_check_arr)
    #
    # #secret key is SHA256 of bot token
    # secret_key = hashlib.sha256(config.TOKEN.encode("utf-8")).digest()
    # computed_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    #
    # print(f"Hash comparing: \n{computed_hash}\n{hash_received}\n")
    #
    # if computed_hash != hash_received:
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect init_data")
    #
    # return data_dict

