from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from soundlab_web.routers import jingle

router = APIRouter()

# ツールごとの設定定義
TOOL_SETTINGS = [
    {
        "tool": "Jingle Generator",
        "icon": "🎵",
        "description": "テキストプロンプトからAIでジングルを生成",
        "settings": [
            {
                "key": "TEXT2JINGLE_BACKEND",
                "label": "Backend",
                "type": "select",
                "options": ["replicate-musicgen", "elevenlabs-music"],
                "default": "replicate-musicgen",
                "help": "音楽生成に使用するバックエンドを選択。",
            },
            {
                "key": "REPLICATE_API_TOKEN",
                "label": "Replicate API Token",
                "type": "password",
                "placeholder": "r8_xxxxxxxxxxxx",
                "help": "Replicate APIのトークン。MusicGenバックエンドに必要です。",
            },
            {
                "key": "ELEVENLABS_API_KEY",
                "label": "ElevenLabs API Key",
                "type": "password",
                "placeholder": "xi_xxxxxxxxxxxx",
                "help": "ElevenLabs APIキー。ElevenLabs Musicバックエンドに必要です。",
            },
        ],
    },
    {
        "tool": "Web Synth",
        "icon": "🎹",
        "description": "ブラウザシンセサイザー",
        "settings": [],
    },
]


def _all_setting_items():
    """全ツールの設定項目をフラットに返す"""
    for group in TOOL_SETTINGS:
        yield from group["settings"]


@router.get("/")
async def settings_page(request: Request):
    templates = request.app.state.templates
    settings_svc = request.app.state.settings

    current = {}
    for item in _all_setting_items():
        current[item["key"]] = settings_svc.get(item["key"], item.get("default", ""))

    return templates.TemplateResponse(
        "settings/index.html",
        {
            "request": request,
            "tool_settings": TOOL_SETTINGS,
            "current": current,
            "saved": request.query_params.get("saved") == "1",
        },
    )


@router.post("/")
async def save_settings(request: Request):
    settings_svc = request.app.state.settings
    form = await request.form()

    for item in _all_setting_items():
        key = item["key"]
        value = form.get(key, "")
        if item["type"] == "password" and value == "":
            continue
        settings_svc.set(key, str(value))

    jingle.reset_service()
    return RedirectResponse(url="/settings/?saved=1", status_code=303)
