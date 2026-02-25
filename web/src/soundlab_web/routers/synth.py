from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/")
async def synth_page(request: Request):
    templates = request.app.state.templates
    return templates.TemplateResponse(
        "tools/synth/index.html",
        {"request": request},
    )
