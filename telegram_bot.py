from aiogram import Bot, Dispatcher
from config import config
from bot_handlers import router as bot_router

bot = Bot(config.TOKEN)
dp = Dispatcher()
dp.include_router(bot_router)