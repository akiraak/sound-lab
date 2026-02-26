import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass
class Config:
    replicate_api_token: str = ""
    elevenlabs_api_key: str = ""
    default_backend: str = "replicate-musicgen"
    default_duration: int = 8
    default_output_format: str = "wav"
    output_dir: str = "./output"


def load_config() -> Config:
    """環境変数と.envファイルから設定を読み込む"""
    load_dotenv()

    backend = os.environ.get("TEXT2JINGLE_BACKEND", "replicate-musicgen")
    replicate_token = os.environ.get("REPLICATE_API_TOKEN", "")
    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY", "")

    if backend == "replicate-musicgen" and not replicate_token:
        raise ValueError(
            "REPLICATE_API_TOKEN が設定されていません。\n"
            ".env ファイルを作成するか、環境変数を設定してください。"
        )
    if backend == "elevenlabs-music" and not elevenlabs_key:
        raise ValueError(
            "ELEVENLABS_API_KEY が設定されていません。\n"
            ".env ファイルを作成するか、環境変数を設定してください。"
        )

    return Config(
        replicate_api_token=replicate_token,
        elevenlabs_api_key=elevenlabs_key,
        default_backend=backend,
        default_duration=int(os.environ.get("TEXT2JINGLE_DURATION", "8")),
        default_output_format=os.environ.get("TEXT2JINGLE_FORMAT", "wav"),
        output_dir=os.environ.get("TEXT2JINGLE_OUTPUT_DIR", "./output"),
    )
