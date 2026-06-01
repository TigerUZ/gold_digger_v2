# Деплой Gold Digger (новый VPS + CD)

## Файлы в проекте

| Файл | Назначение |
|------|------------|
| `Dockerfile` | Сборка frontend + backend |
| `docker-compose.yml` | PostgreSQL + app + Caddy |
| `Caddyfile` | HTTPS и прокси на приложение |
| `docker/entrypoint.sh` | Миграции БД и запуск uvicorn |
| `.dockerignore` | Что не класть в образ |
| `.env.example` | Шаблон переменных (копия → `.env` на сервере) |
| `scripts/deploy.sh` | Запуск `docker compose up` на VPS |
| `scripts/server-bootstrap.sh` | Один раз: Docker на чистом Ubuntu |
| `.github/workflows/deploy.yml` | Автодеплой после CI |
| `.github/workflows/check-code.yml` | Тесты перед деплоем |

`.env` только на сервере, в Git не попадает.

## Шаг 1. Новый VPS

1. Арендуй VPS: Ubuntu 22.04, от 2 GB RAM.
2. Запиши: **IP**, **логин** (обычно `root`), **пароль**.
3. Проверь с Mac:

```bash
ssh root@IP_СЕРВЕРА
```

Должен спросить пароль и пустить. Если `timed out` — у хостера закрыт порт 22, напиши в поддержку.

## Шаг 2. DNS (reg.ru)

Домен `gold-digger.ru` → записи **A**:

| Имя | IP |
|-----|-----|
| `@` | IP VPS |
| `www` | IP VPS |

## Шаг 3. Подготовка сервера (один раз)

На VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/TigerUZ/gold_digger_v2/main/scripts/server-bootstrap.sh -o /tmp/bootstrap.sh
```

Если `curl` к GitHub не работает — скопируй `scripts/server-bootstrap.sh` вручную через SSH или вставь содержимое файла.

```bash
chmod +x /tmp/bootstrap.sh
/tmp/bootstrap.sh
```

Или вручную:

```bash
apt update
apt install -y docker.io docker-compose git curl
systemctl enable docker --now
mkdir -p /opt/gold_digger_v2
```

## Шаг 4. Файл `.env` на сервере

```bash
nano /opt/gold_digger_v2/.env
```

| Переменная | Откуда взять |
|------------|----------------|
| `DOMAIN` | `gold-digger.ru` |
| `ACME_EMAIL` | Твоя почта |
| `APP_URL` | `https://gold-digger.ru` |
| `TOKEN` | @BotFather → API Token |
| `BOT_USERNAME` | username бота без `@` |
| `BOT_WEBAPP_SHORT_NAME` | BotFather Mini App или пусто |
| `DB_USER` | Любое имя, например `gold_digger` |
| `DB_PASSWORD` | Придумай длинный пароль |
| `DB_DATABASE` | Например `gold_digger` |
| `REFERRAL_GOLD_QTY` | Например `500` |

## Шаг 5. SSH-ключ для GitHub Actions

На Mac:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gold_digger_deploy -N ""
ssh-copy-id -i ~/.ssh/gold_digger_deploy.pub root@IP_СЕРВЕРА
ssh -i ~/.ssh/gold_digger_deploy root@IP_СЕРВЕРА
```

## Шаг 6. Secrets на GitHub

Репозиторий → Settings → Secrets and variables → Actions:

| Secret | Значение |
|--------|----------|
| `SSH_HOST` | IP VPS |
| `SSH_USER` | `root` |
| `SSH_PRIVATE_KEY` | Содержимое файла `~/.ssh/gold_digger_deploy` |
| `DEPLOY_PATH` | `/opt/gold_digger_v2` |
| `SSH_PORT` | `22` |

## Шаг 7. Push и автодеплой

На Mac:

```bash
cd ~/Desktop/Gold_Digger
git add .
git commit -m "Add Docker and CD deploy"
git push origin main
```

GitHub → Actions:

1. **Python Code Check** — зелёный
2. **Deploy to VPS** — зелёный

## Шаг 8. BotFather

После успешного деплоя:

- Domain: `gold-digger.ru`
- Web App URL: `https://gold-digger.ru`

Проверка: открыть бота в Telegram.

## Шаг 9. Проверка на сервере

```bash
cd /opt/gold_digger_v2
docker compose ps
docker compose logs -f app
```

Сайт: https://gold-digger.ru

## Как работает CD

```
push в main → CI (ruff + pytest) → Deploy:
  backup .env → scp кода → restore .env → ./scripts/deploy.sh
```

Каждый push пересобирает контейнер `app` и перезапускает стек.

## Ручной деплой без GitHub

```bash
cd /opt/gold_digger_v2
./scripts/deploy.sh
```
