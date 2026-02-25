from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class GenerateRequest:
    """ジングル生成リクエスト"""

    prompt: str
    duration: int = 8
    output_format: str = "wav"
    model_version: str = "stereo-melody-large"
    seed: int | None = None


@dataclass
class GenerateResult:
    """ジングル生成結果"""

    audio_url: str
    audio_path: Path | None = None
    duration: float = 0.0
    backend_name: str = ""
    metadata: dict = field(default_factory=dict)
