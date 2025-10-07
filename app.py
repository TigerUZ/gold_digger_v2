from fastapi import FastAPI, Request
from aiogram.types import Update

from config import config
from contextlib import asynccontextmanager
import logging

from telegram_bot import bot, dp


@asynccontextmanager
async def lifespan(app: FastAPI):
    webhook_url = config.WEBHOOK_URL
    await bot.set_webhook(
        url=webhook_url,
        allowed_updates=dp.resolve_used_update_types(),
        drop_pending_updates=True
    )
    logging.info(f"Webhook set to {webhook_url}")

    yield  # Приложение работает

    await bot.delete_webhook()
    logging.info("Webhook removed")

    await bot.session.close()
    logging.info("Bot terminated")

app = FastAPI(lifespan=lifespan)

# Маршрут для обработки вебхуков
@app.post("/webhook")
async def webhook(request: Request) -> None:
    logging.info("Received webhook request")
    raw_update = await request.json()  # Получаем данные из запроса
    update = Update.model_validate(raw_update)
    # Обрабатываем обновление через диспетчер (dp) и передаем в бот
    print(update.message.text)
    await dp.feed_update(bot, update)
    logging.info("Update processed")