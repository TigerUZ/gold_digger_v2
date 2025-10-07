from datetime import datetime
from sqlalchemy import Integer, BigInteger, String, Date, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from config import config


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str] = mapped_column(String, nullable=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=True)

    # referrals
    referral_code: Mapped[str] = mapped_column(String, nullable=True)


    # relationships
    course = relationship("Course", back_populates="chapters")
    game_mechanic = relationship("GameMechanic", back_populates="user", cascade="all, delete-orphan")
    referrals = relationship("Referral")

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class GameMechanic(Base):
    __tablename__ = "game_mechanics"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    total_gold: Mapped[int] = mapped_column(Integer, default=0)
    lives: Mapped[int] = mapped_column(Integer, default=6)
    rounds_played: Mapped[int] = mapped_column(Integer, default=0)
    best_round_gold: Mapped[int] = mapped_column(Integer, default=0)
    last_round_played_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    daily_bonus_step: Mapped[int] = mapped_column(Integer, default = 0)
    daily_bonus_last_taken_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # relationships
    user = relationship("User", back_populates="game_mechanic", )


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    referral_master_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    referral_user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    referral_gain_gold: Mapped[int] = mapped_column(Integer, default=config.REFERRAL_GOLD_QTY)

    #realtionships
    referral_user = relationship("User", foreign_keys=[referral_user_id], primaryjoin="Referrals.referral_user_id == User.id")
