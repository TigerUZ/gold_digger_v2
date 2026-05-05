from datetime import datetime
from sqlalchemy import Integer, BigInteger, String, ForeignKey, Boolean, DateTime
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
    # Use selectin to avoid async lazy-load (MissingGreenlet)
    game_mechanic = relationship(
        "GameMechanic",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )
    referrals_made = relationship(
        "Referral",
        foreign_keys="[Referral.referral_master_id]",
        back_populates="referral_master",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    referrals_received = relationship(
        "Referral",
        foreign_keys="[Referral.referral_user_id]",
        back_populates="referral_user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # def __repr__(self):
    #     return (f"User info:\nid: {self.id}\nUsername: {self.username}\nFull name: {self.first_name} {self.last_name}\n"
    #             f"Referral code: {self.referral_code}\nGame mechanic: {self.game_mechanic}\n")


class GameMechanic(Base):
    __tablename__ = "game_mechanics"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    total_gold: Mapped[int] = mapped_column(Integer, default=0)
    lives: Mapped[int] = mapped_column(Integer, default=5)
    rounds_played: Mapped[int] = mapped_column(Integer, default=0)
    best_round_gold: Mapped[int] = mapped_column(Integer, default=0)
    last_round_played_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    daily_bonus_step: Mapped[int] = mapped_column(Integer, default = 0)
    daily_bonus_last_taken_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # relationships
    user = relationship("User", back_populates="game_mechanic")


    # def __repr__(self):
    #     return (f"Total gold: {self.total_gold} | Lives: {self.lives} | Rounds played: {self.rounds_played} | "
    #             f"Best round gold: {self.best_round_gold} | Last played: {self.last_round_played_at} | "
    #             f"Daily bonus step: {self.daily_bonus_step} | Daily bonus last taken: {self.daily_bonus_last_taken_at}")


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    referral_master_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    referral_user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    referral_gain_gold: Mapped[int] = mapped_column(Integer, default=config.REFERRAL_GOLD_QTY)

    #realtionships
    referral_master = relationship(
        "User",
        foreign_keys=[referral_master_id],
        back_populates="referrals_made",
    )
    referral_user = relationship(
        "User",
        foreign_keys=[referral_user_id],
        back_populates="referrals_received",
    )