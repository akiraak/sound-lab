import urllib.request
from datetime import datetime
from pathlib import Path

from pydub import AudioSegment

from text2jingle.models import GenerateResult


def apply_fadeout(filepath: Path, fadeout_ms: int = 1000) -> None:
    """音声ファイルの末尾にフェードアウトを適用する"""
    audio = AudioSegment.from_file(filepath)
    faded = audio.fade_out(fadeout_ms)
    faded.export(filepath, format=filepath.suffix.lstrip("."))


def save_audio(
    result: GenerateResult,
    output_dir: str,
    filename: str | None = None,
    fadeout_ms: int = 1000,
) -> Path:
    """音声URLからファイルをダウンロードして保存する"""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = "mp3" if result.audio_url.endswith(".mp3") else "wav"
        filename = f"jingle_{timestamp}.{ext}"

    filepath = output_path / filename
    urllib.request.urlretrieve(result.audio_url, filepath)
    result.audio_path = filepath

    if fadeout_ms > 0:
        apply_fadeout(filepath, fadeout_ms)

    return filepath
