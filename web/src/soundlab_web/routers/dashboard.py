from fastapi import APIRouter, Request

from soundlab_web.models import ToolInfo

router = APIRouter()

TOOLS = [
    ToolInfo(
        name="Jingle Generator",
        description="テキストプロンプトからAI（MusicGen）でジングルを生成",
        route="/tools/jingle/",
        icon="🎵",
    ),
]


@router.get("/")
async def dashboard(request: Request):
    templates = request.app.state.templates
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "tools": TOOLS},
    )
