import pytest

from auth.bot_info import build_referral_link
from auth.utils import parse_referral_code
from config import config


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, None),
        ("", None),
        ("ref_abc123", "abc123"),
        ("abc123", "abc123"),
        ("  ref_xyz  ", "xyz"),
    ],
)
def test_parse_referral_code(raw, expected):
    assert parse_referral_code(raw) == expected


@pytest.mark.asyncio
async def test_build_referral_link_with_webapp_short_name(monkeypatch):
    monkeypatch.setattr(config, "BOT_USERNAME", "MyBot")
    monkeypatch.setattr(config, "BOT_WEBAPP_SHORT_NAME", "golddigger")

    link = await build_referral_link("code42")

    assert link == "https://t.me/MyBot/golddigger?startapp=ref_code42"


@pytest.mark.asyncio
async def test_build_referral_link_without_webapp_short_name(monkeypatch):
    monkeypatch.setattr(config, "BOT_USERNAME", "MyBot")
    monkeypatch.setattr(config, "BOT_WEBAPP_SHORT_NAME", "")

    link = await build_referral_link("code42")

    assert link == "https://t.me/MyBot?start=ref_code42"
