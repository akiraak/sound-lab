from elevenlabs.client import ElevenLabs

from text2jingle.backends.base import MusicBackend
from text2jingle.models import GenerateRequest, GenerateResult


class ElevenLabsMusicBackend(MusicBackend):
    """ElevenLabs Music APIバックエンド"""

    MODEL_ID = "music_v1"

    FORMAT_MAP = {
        "mp3": "mp3_44100_128",
        "wav": "mp3_44100_128",
    }

    def __init__(self, api_key: str):
        self._client = ElevenLabs(api_key=api_key)

    @property
    def name(self) -> str:
        return "elevenlabs-music"

    def _enhance_prompt(self, prompt: str, duration: int) -> str:
        """プロンプトに長さと終わり方のヒントを自動付加する"""
        return f"{prompt}, {duration} seconds, with a clear ending"

    def generate(self, request: GenerateRequest) -> GenerateResult:
        enhanced_prompt = self._enhance_prompt(request.prompt, request.duration)
        duration_ms = max(3000, min(600_000, request.duration * 1000))
        output_format = self.FORMAT_MAP.get(request.output_format, "mp3_44100_128")

        audio_iter = self._client.music.compose(
            prompt=enhanced_prompt,
            model_id=self.MODEL_ID,
            music_length_ms=duration_ms,
            output_format=output_format,
        )

        data = b"".join(audio_iter)

        return GenerateResult(
            audio_data=data,
            duration=request.duration,
            backend_name=self.name,
            metadata={
                "model_id": self.MODEL_ID,
                "output_format": "mp3",
                "duration_ms": duration_ms,
            },
        )
