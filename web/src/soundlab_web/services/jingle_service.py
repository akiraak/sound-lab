import json
import uuid
from datetime import datetime
from pathlib import Path

from text2jingle.backends import get_backend
from text2jingle.config import load_config
from text2jingle.models import GenerateRequest
from text2jingle.output import save_audio

from soundlab_web.models import JingleJob, JobStatus


class JingleService:
    def __init__(self, output_dir: Path, data_dir: Path):
        self.output_dir = output_dir
        self._data_dir = data_dir
        self._history_file = data_dir / "history.json"
        self._jobs: dict[str, JingleJob] = {}
        self._config = load_config()
        self._backend = get_backend(self._config)

    def create_job(
        self,
        prompt: str,
        duration: int = 8,
        output_format: str = "wav",
        model_version: str = "stereo-melody-large",
        seed: int | None = None,
        fadeout_ms: int = 1000,
    ) -> str:
        job_id = str(uuid.uuid4())
        job = JingleJob(
            id=job_id,
            status=JobStatus.PENDING,
            prompt=prompt,
            duration=duration,
            output_format=output_format,
            model_version=model_version,
            seed=seed,
            fadeout_ms=fadeout_ms,
        )
        self._jobs[job_id] = job
        return job_id

    def run_generation(self, job_id: str) -> None:
        job = self._jobs[job_id]
        job.status = JobStatus.RUNNING

        try:
            request = GenerateRequest(
                prompt=job.prompt,
                duration=job.duration,
                output_format=job.output_format,
                model_version=job.model_version,
                seed=job.seed,
            )
            result = self._backend.generate(request)
            filepath = save_audio(
                result,
                output_dir=str(self.output_dir),
                fadeout_ms=job.fadeout_ms,
            )

            job.status = JobStatus.COMPLETED
            job.filename = filepath.name
            job.audio_path = str(filepath)
            job.completed_at = datetime.now()
            self._save_to_history(job)

        except Exception as e:
            job.status = JobStatus.FAILED
            job.error = str(e)

    def get_job(self, job_id: str) -> JingleJob | None:
        return self._jobs.get(job_id)

    def get_history(self, limit: int = 20) -> list[dict]:
        if not self._history_file.exists():
            return []
        data = json.loads(self._history_file.read_text())
        return list(reversed(data[-limit:]))

    def _save_to_history(self, job: JingleJob) -> None:
        data = []
        if self._history_file.exists():
            data = json.loads(self._history_file.read_text())
        data.append({
            "id": job.id,
            "prompt": job.prompt,
            "duration": job.duration,
            "output_format": job.output_format,
            "model_version": job.model_version,
            "filename": job.filename,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        })
        self._history_file.write_text(json.dumps(data, ensure_ascii=False, indent=2))
