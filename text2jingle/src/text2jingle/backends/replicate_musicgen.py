import replicate

from text2jingle.backends.base import MusicBackend
from text2jingle.models import GenerateRequest, GenerateResult


class ReplicateMusicGenBackend(MusicBackend):
    """Replicate API経由のMusicGenバックエンド"""

    MODEL_ID = "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb"
    VALID_MODELS = ("stereo-melody-large", "stereo-large", "melody-large", "large")

    def __init__(self, api_token: str):
        self._client = replicate.Client(api_token=api_token)

    @property
    def name(self) -> str:
        return "replicate-musicgen"

    def _enhance_prompt(self, prompt: str, duration: int) -> str:
        """プロンプトに長さと終わり方のヒントを自動付加する"""
        return f"{prompt}, {duration} seconds, with a clear ending"

    def generate(self, request: GenerateRequest) -> GenerateResult:
        enhanced_prompt = self._enhance_prompt(request.prompt, request.duration)
        input_params = {
            "prompt": enhanced_prompt,
            "duration": request.duration,
            "model_version": request.model_version,
            "output_format": request.output_format,
        }
        if request.seed is not None:
            input_params["seed"] = request.seed

        output = self._client.run(self.MODEL_ID, input=input_params)
        audio_url = str(output)

        return GenerateResult(
            audio_url=audio_url,
            duration=request.duration,
            backend_name=self.name,
        )
