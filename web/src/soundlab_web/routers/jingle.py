import asyncio
from pathlib import Path

from fastapi import APIRouter, Form, Request
from fastapi.responses import FileResponse, HTMLResponse

from soundlab_web.services.jingle_service import JingleService

router = APIRouter()

_service: JingleService | None = None


def _get_service(request: Request) -> JingleService:
    global _service
    if _service is None:
        config = request.app.state.config
        settings = request.app.state.settings
        _service = JingleService(
            output_dir=config.output_dir,
            data_dir=config.data_dir,
            settings=settings,
        )
    return _service


@router.get("/")
async def jingle_page(request: Request):
    templates = request.app.state.templates
    return templates.TemplateResponse(
        "tools/jingle/index.html",
        {"request": request},
    )


@router.post("/generate")
async def generate(
    request: Request,
    prompt: str = Form(...),
    duration: int = Form(8),
    output_format: str = Form("wav"),
    model_version: str = Form("stereo-melody-large"),
    seed: str = Form(""),
    fadeout_ms: int = Form(1000),
):
    service = _get_service(request)
    templates = request.app.state.templates

    seed_value = int(seed) if seed.strip() else None

    job_id = service.create_job(
        prompt=prompt,
        duration=duration,
        output_format=output_format,
        model_version=model_version,
        seed=seed_value,
        fadeout_ms=fadeout_ms,
    )
    asyncio.create_task(asyncio.to_thread(service.run_generation, job_id))

    return templates.TemplateResponse(
        "tools/jingle/_progress.html",
        {"request": request, "job_id": job_id},
    )


@router.get("/jobs/{job_id}/status")
async def job_status(request: Request, job_id: str):
    service = _get_service(request)
    templates = request.app.state.templates
    job = service.get_job(job_id)

    if job is None:
        return HTMLResponse("Job not found", status_code=404)

    if job.status.value in ("pending", "running"):
        return templates.TemplateResponse(
            "tools/jingle/_progress.html",
            {"request": request, "job_id": job_id},
        )

    if job.status.value == "completed":
        response = templates.TemplateResponse(
            "tools/jingle/_result.html",
            {"request": request, "job": job},
        )
        response.headers["HX-Trigger"] = "historyUpdated"
        return response

    # failed
    return templates.TemplateResponse(
        "tools/jingle/_error.html",
        {"request": request, "job": job},
    )


@router.get("/audio/{filename}")
async def serve_audio(filename: str, request: Request):
    service = _get_service(request)
    filepath = service.output_dir / Path(filename).name
    if not filepath.exists():
        return HTMLResponse("File not found", status_code=404)
    media_type = "audio/mpeg" if filepath.suffix == ".mp3" else "audio/wav"
    return FileResponse(filepath, media_type=media_type)


@router.get("/download/{filename}")
async def download_audio(filename: str, request: Request):
    service = _get_service(request)
    filepath = service.output_dir / Path(filename).name
    if not filepath.exists():
        return HTMLResponse("File not found", status_code=404)
    media_type = "audio/mpeg" if filepath.suffix == ".mp3" else "audio/wav"
    return FileResponse(
        filepath,
        media_type=media_type,
        filename=filepath.name,
        headers={"Content-Disposition": f"attachment; filename={filepath.name}"},
    )


@router.get("/history")
async def history(request: Request):
    service = _get_service(request)
    templates = request.app.state.templates
    jobs = service.get_history()
    return templates.TemplateResponse(
        "tools/jingle/_history.html",
        {"request": request, "jobs": jobs},
    )
