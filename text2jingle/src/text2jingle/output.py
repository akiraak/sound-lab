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


def _detect_ext(result: GenerateResult) -> str:
    """生成結果から出力ファイルの拡張子を判定する"""
    if result.audio_url and result.audio_url.endswith(".mp3"):
        return "mp3"
    fmt = result.metadata.get("output_format", "")
    if fmt in ("mp3", "wav"):
        return fmt
    return "wav"


def save_audio(
    result: GenerateResult,
    output_dir: str,
    filename: str | None = None,
    fadeout_ms: int = 1000,
) -> Path:
    """音声URLまたはバイナリデータからファイルを保存する"""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = _detect_ext(result)
        filename = f"jingle_{timestamp}.{ext}"

    filepath = output_path / filename

    if result.audio_data is not None:
        filepath.write_bytes(result.audio_data)
    elif result.audio_url:
        urllib.request.urlretrieve(result.audio_url, filepath)
    else:
        raise ValueError("GenerateResult に audio_url も audio_data もありません")

    result.audio_path = filepath

    if fadeout_ms > 0:
        apply_fadeout(filepath, fadeout_ms)

    return filepath
