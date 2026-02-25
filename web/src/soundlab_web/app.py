from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from soundlab_web.config import WebConfig, load_web_config
from soundlab_web.routers import dashboard, jingle, synth

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg: WebConfig = app.state.config
    cfg.output_dir.mkdir(parents=True, exist_ok=True)
    cfg.data_dir.mkdir(parents=True, exist_ok=True)
    yield


def create_app() -> FastAPI:
    config = load_web_config()

    app = FastAPI(title="Sound Lab", lifespan=lifespan)
    app.state.config = config
    app.state.templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
    app.state.templates.env.globals["tools"] = dashboard.TOOLS

    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    app.include_router(dashboard.router)
    app.include_router(jingle.router, prefix="/tools/jingle")
    app.include_router(synth.router, prefix="/tools/synth")

    return app


app = create_app()


def main():
    config = load_web_config()
    uvicorn.run(
        "soundlab_web.app:app",
        host=config.host,
        port=config.port,
        reload=True,
    )
