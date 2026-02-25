from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

router = APIRouter()

# 設定キーの定義
SETTING_KEYS = [
    {
        "key": "REPLICATE_API_TOKEN",
        "label": "Replicate API Token",
        "type": "password",
        "placeholder": "r8_xxxxxxxxxxxx",
        "help": "Replicate APIのトークン。text2jingleのMusicGenバックエンドに必要です。",
    },
    {
        "key": "TEXT2JINGLE_BACKEND",
        "label": "デフォルトバックエンド",
        "type": "text",
        "placeholder": "replicate-musicgen",
        "help": "音楽生成に使用するバックエンド名。",
        "default": "replicate-musicgen",
    },
    {
        "key": "TEXT2JINGLE_DURATION",
        "label": "デフォルト生成時間（秒）",
        "type": "number",
        "placeholder": "8",
        "help": "ジングル生成のデフォルト長さ（秒）。",
        "default": "8",
    },
    {
        "key": "TEXT2JINGLE_FORMAT",
        "label": "デフォルト出力形式",
        "type": "select",
        "options": ["wav", "mp3"],
        "help": "生成される音声ファイルの形式。",
        "default": "wav",
    },
]


@router.get("/")
async def settings_page(request: Request):
    templates = request.app.state.templates
    settings_svc = request.app.state.settings

    # 現在の設定値を読み込み
    current = {}
    for item in SETTING_KEYS:
        val = settings_svc.get(item["key"], item.get("default", ""))
        current[item["key"]] = val

    return templates.TemplateResponse(
        "settings/index.html",
        {
            "request": request,
            "setting_keys": SETTING_KEYS,
            "current": current,
            "saved": request.query_params.get("saved") == "1",
        },
    )


@router.post("/")
async def save_settings(request: Request):
    settings_svc = request.app.state.settings
    form = await request.form()

    for item in SETTING_KEYS:
        key = item["key"]
        value = form.get(key, "")
        # パスワード欄が空の場合は既存値を維持
        if item["type"] == "password" and value == "":
            continue
        settings_svc.set(key, str(value))

    return RedirectResponse(url="/settings/?saved=1", status_code=303)
