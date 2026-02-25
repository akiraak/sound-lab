from abc import ABC, abstractmethod

from text2jingle.models import GenerateRequest, GenerateResult


class MusicBackend(ABC):
    """音楽生成バックエンドの基底クラス"""

    @property
    @abstractmethod
    def name(self) -> str:
        """バックエンドの識別名"""
        ...

    @abstractmethod
    def generate(self, request: GenerateRequest) -> GenerateResult:
        """テキストプロンプトから音楽を生成する"""
        ...
