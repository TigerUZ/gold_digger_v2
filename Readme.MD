Gold Digger - Telegram WebApp Game

Gold Digger - это Telegram WebApp-игра, реализованная на основе клиент-серверной архитектуры с использованием FastAPI, aiogram, React и PostgreSQL. Сервер является источником истины: вся бизнес-логика, начисление наград и синхронизация жизней выполняются на backend.

Запуск проекта локально через ngrok

Для корректной работы Telegram WebApp необходимо запустить backend и пробросить локальный сервер через ngrok.

1. Активация виртуальной среды Python

Перед запуском необходимо активировать виртуальное окружение:

Mac/Linux:
source .venv/bin/activate

Windows:
.venv\Scripts\activate

2. Убедитесь, что вы находитесь в корневой директории проекта

Вы должны находиться в папке, где расположен файл app.py.

3. Запуск backend-сервера

Выполните команду:

uvicorn app:app --port 5050 --reload

После запуска сервер будет доступен по адресу:
http://localhost:5050

4. Запуск ngrok

В отдельном терминале выполните:

ngrok http 5050

ngrok выдаст публичный HTTPS-адрес вида:
https://random-name.ngrok-free.app

5. Обновление переменной окружения

Скопируйте HTTPS-адрес, выданный ngrok, и вставьте его в файл .env:

APP_URL="https://random-name.ngrok-free.app"

Сохраните файл.