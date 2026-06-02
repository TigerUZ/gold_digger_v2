# Gold Digger — Telegram WebApp

Игра в Telegram: крот, жизни, золото, ежедневный бонус, друзья, кошелёк.

Backend: FastAPI, aiogram, PostgreSQL. Frontend: React (Vite). Логика игры на сервере.

Сайт: https://gold-digger.ru  
Бот: https://t.me/GoldDiggerUZBot  
GitHub: https://github.com/TigerUZ/gold_digger_v2

Подробный деплой на VPS — в [DEPLOY.md](DEPLOY.md).

## Запуск локально (ngrok)

Нужны Python 3.10+, PostgreSQL, ngrok и токен бота от BotFather.

1. Клонировать репозиторий, перейти в папку проекта.

2. Виртуальное окружение и зависимости:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows: `.venv\Scripts\activate`

3. Файл `.env` — скопировать из `.env.example` и заполнить `TOKEN`, `BOT_USERNAME`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`. В git `.env` не класть.

4. Создать базу в PostgreSQL, применить миграции:

```bash
alembic upgrade head
```

5. Запуск backend (из корня, где `app.py`):

```bash
uvicorn app:app --port 5050 --reload
```

http://localhost:5050

6. В другом терминале ngrok:

```bash
ngrok http 5050
```

7. HTTPS-адрес из ngrok вписать в `.env`:

```
APP_URL=https://xxxx.ngrok-free.app
```

8. В BotFather указать этот URL для Web App. Игру открывать из бота, не в обычном браузере.

## Переменные .env

- `TOKEN` — токен бота  
- `BOT_USERNAME` — имя без @  
- `BOT_WEBAPP_SHORT_NAME` — можно пусто  
- `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` — база  
- `APP_URL` — HTTPS для Mini App (без / в конце)  
- для сервера ещё: `DOMAIN`, `ACME_EMAIL`, `REFERRAL_GOLD_QTY` — см. `.env.example`

## Frontend (если нужна отдельная разработка)

```bash
cd frontend
npm install
npm run dev
```

Для Telegram обычно хватает backend; сборка: `npm run build` (в Docker делается сама).

## Тесты

```bash
pip install ruff pytest pytest-asyncio httpx
ruff check --exclude ./migrations .
pytest -q
```

Зависимости Python — в `requirements.txt`.
