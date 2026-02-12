from sqlalchemy.testing.suite.test_reflection import users

from auth.utils import verify_telegram_init_data, create_referral_code, get_user_from_db, create_user_in_db
from fastapi import Request
from fastapi import APIRouter
from database import SessionDep
from models import User
from auth.schemas import UserSchema

router = APIRouter(prefix="/auth")

@router.post("/webapp", response_model=UserSchema)
async def auth(request: Request, session: SessionDep):
    # request_json = await request.json()
    # user_data = await verify_telegram_init_data(request_json["initData"])
    user_id = 1209921557
    user = await get_user_from_db(user_id, session)

    # if not user:
    #     user = await create_user_in_db(user_data, session)

    result = UserSchema.model_validate(user)
    print(result)
    return result




