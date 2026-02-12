from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from aiogram.types import Update, MenuButtonWebApp, WebAppInfo

from config import config
from contextlib import asynccontextmanager
import logging

from telegram_bot import bot, dp

from auth.router import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    webhook_url = config.get_webhook_url()
    await bot.set_webhook(
        url=webhook_url,
        allowed_updates=dp.resolve_used_update_types(),
        drop_pending_updates=True
    )
    logging.info(f"Webhook set to {webhook_url}")

    # set chat menu button to web app url
    web_app_info = WebAppInfo(url=config.APP_URL)
    web_app_button = MenuButtonWebApp(text="Gold Digger", web_app=web_app_info)
    await bot.set_chat_menu_button(menu_button=web_app_button)
    print(f"Menu button set to {web_app_info.url}")

    yield  # Приложение работает

    await bot.delete_webhook()
    print("Webhook removed")

    await bot.session.close()
    print("Bot terminated")

app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
app.mount("/img", StaticFiles(directory="frontend/dist/img"), name="img")


# Маршрут для обработки вебхуков
@app.post("/webhook")
async def webhook(request: Request) -> None:
    print("Received webhook request")
    raw_update = await request.json()  # Получаем данные из запроса
    update = Update.model_validate(raw_update)
    # Обрабатываем обновление через диспетчер (dp) и передаем в бот
    # print(update.message.text)
    await dp.feed_update(bot, update)
    print("Update processed")


@app.get("/")
async def initialize(request: Request, response_class=HTMLResponse):
    with open("frontend/dist/index.html", "r") as file:
        return HTMLResponse(content=file.read())
