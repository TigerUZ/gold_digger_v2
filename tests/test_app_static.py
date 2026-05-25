from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.testclient import TestClient


def test_sounds_static_mount_serves_file():
    sounds_dir = Path("frontend/dist/sounds")
    if not sounds_dir.exists():
        return

    app = FastAPI()
    app.mount("/sounds", StaticFiles(directory=sounds_dir), name="sounds")

    with TestClient(app) as client:
        response = client.get("/sounds/whack.mp3")

    assert response.status_code == 200
    assert "audio" in (response.headers.get("content-type") or "")
