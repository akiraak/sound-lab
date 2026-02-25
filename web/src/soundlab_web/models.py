from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


@dataclass
class ToolInfo:
    name: str
    description: str
    route: str
    icon: str


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class JingleJob:
    id: str
    status: JobStatus
    prompt: str
    duration: int = 8
    output_format: str = "wav"
    model_version: str = "stereo-melody-large"
    seed: int | None = None
    fadeout_ms: int = 1000
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: datetime | None = None
    filename: str | None = None
    audio_path: str | None = None
    error: str | None = None
