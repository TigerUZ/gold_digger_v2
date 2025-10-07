from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_PORT = os.getenv("DB_PORT")
    DB_HOST = os.getenv("DB_HOST")
    DB_DATABASE = os.getenv("DB_DATABASE")

    # referrals
    REFERRAL_GOLD_QTY = int(os.getenv("REFERRAL_GOLD_QTY"))

    def get_db_url(self):
        """
        Construct the database URL from the configuration.
        """
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"

config = Config()
