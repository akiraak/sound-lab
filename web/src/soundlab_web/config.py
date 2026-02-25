import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass
class WebConfig:
    host: str = "0.0.0.0"
    port: int = 8000
    output_dir: Path = Path("output")
    data_dir: Path = Path("data")


def load_web_config() -> WebConfig:
    load_dotenv()
    return WebConfig(
        host=os.environ.get("SOUNDLAB_HOST", "0.0.0.0"),
        port=int(os.environ.get("SOUNDLAB_PORT", "8000")),
    )
