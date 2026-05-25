from __future__ import annotations

from config import config

_cached_username: str | None = None


async def get_bot_username() -> str:
    global _cached_username

    if _cached_username:
        return _cached_username

    env_username = (config.BOT_USERNAME or "").lstrip("@")
    if env_username:
        _cached_username = env_username
        return _cached_username

    from telegram_bot import bot

    me = await bot.get_me()
    _cached_username = me.username or ""
    return _cached_username


async def build_referral_link(referral_code: str) -> str:
    if not referral_code:
        return ""

    username = await get_bot_username()
    if not username:
        return ""

    short_name = (config.BOT_WEBAPP_SHORT_NAME or "").strip()
    if short_name:
        return f"https://t.me/{username}/{short_name}?startapp=ref_{referral_code}"

    return f"https://t.me/{username}?start=ref_{referral_code}"
