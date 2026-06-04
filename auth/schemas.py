from datetime import datetime

from pydantic import BaseModel, ConfigDict

class GameMechanicSchema(BaseModel):
    user_id: int
    total_gold: int
    lives: int
    mole_lives: int
    mines_lives: int
    rounds_played: int
    best_round_gold: int
    last_round_played_at: datetime | None
    daily_bonus_step: int
    daily_bonus_last_taken_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

class ReferralSchema(BaseModel):
    id: int
    referral_master_id: int
    referral_user_id: int
    referral_gain_gold: int

    model_config = ConfigDict(from_attributes=True)

class UserSchema(BaseModel):
    id: int
    username: str | None
    first_name: str
    last_name: str | None
    referral_code: str

    # relationship (eager-loaded in queries)
    game_mechanic: GameMechanicSchema

    model_config = ConfigDict(from_attributes=True)


