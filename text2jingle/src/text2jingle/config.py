import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass
class Config:
    replicate_api_token: str
    default_backend: str = "replicate-musicgen"
    default_duration: int = 8
    default_output_format: str = "wav"
    output_dir: str = "./output"


def load_config() -> Config:
    """環境変数と.envファイルから設定を読み込む"""
    load_dotenv()

    token = os.environ.get("REPLICATE_API_TOKEN", "")
    if not token:
        raise ValueError(
            "REPLICATE_API_TOKEN が設定されていません。\n"
            ".env ファイルを作成するか、環境変数を設定してください。"
        )

    return Config(
        replicate_api_token=token,
        default_backend=os.environ.get("TEXT2JINGLE_BACKEND", "replicate-musicgen"),
        default_duration=int(os.environ.get("TEXT2JINGLE_DURATION", "8")),
        default_output_format=os.environ.get("TEXT2JINGLE_FORMAT", "wav"),
        output_dir=os.environ.get("TEXT2JINGLE_OUTPUT_DIR", "./output"),
    )
