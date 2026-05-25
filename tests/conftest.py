import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_DATABASE", "test_db")
os.environ.setdefault("REFERRAL_GOLD_QTY", "500")
os.environ.setdefault("TOKEN", "0000000000:TEST_TOKEN_FOR_CI")
os.environ.setdefault("APP_URL", "https://example.com")
os.environ.setdefault("BOT_USERNAME", "gold_digger_test_bot")


@pytest.fixture(autouse=True)
def reset_cached_bot_username():
    import auth.bot_info as bot_info

    bot_info._cached_username = None
    yield
    bot_info._cached_username = None
