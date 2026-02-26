from text2jingle.backends.base import MusicBackend
from text2jingle.backends.elevenlabs_music import ElevenLabsMusicBackend
from text2jingle.backends.replicate_musicgen import ReplicateMusicGenBackend
from text2jingle.config import Config


def get_backend(config: Config) -> MusicBackend:
    """設定に基づいてバックエンドを返す"""
    if config.default_backend == "replicate-musicgen":
        return ReplicateMusicGenBackend(api_token=config.replicate_api_token)
    if config.default_backend == "elevenlabs-music":
        return ElevenLabsMusicBackend(api_key=config.elevenlabs_api_key)
    raise ValueError(f"未知のバックエンド: {config.default_backend}")
