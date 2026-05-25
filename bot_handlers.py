from aiogram import Router
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from auth.utils import save_pending_referral
from config import config
from database import async_session_maker

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject) -> None:
    if message.from_user and command.args and command.args.startswith("ref_"):
        async with async_session_maker() as session:
            await save_pending_referral(message.from_user.id, command.args, session)

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Играть в Gold Digger",
                    web_app=WebAppInfo(url=config.APP_URL),
                )
            ]
        ]
    )

    text = "Добро пожаловать в Gold Digger!"
    if command.args and command.args.startswith("ref_"):
        text += (
            "\n\nВы перешли по приглашению друга. "
            "Нажмите кнопку ниже — игра откроется внутри Telegram."
        )

    await message.answer(text, reply_markup=keyboard)
