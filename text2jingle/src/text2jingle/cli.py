from typing import Optional

import typer

from text2jingle.backends import get_backend
from text2jingle.config import load_config
from text2jingle.models import GenerateRequest
from text2jingle.output import save_audio

app = typer.Typer(help="テキストからジングルを生成するCLIツール")


@app.command()
def generate(
    prompt: str = typer.Argument(..., help="生成したい音楽の説明文"),
    duration: int = typer.Option(
        8, "--duration", "-d", help="生成する音声の長さ（秒）", min=1, max=30
    ),
    output_format: str = typer.Option(
        "wav", "--format", "-f", help="出力フォーマット (wav/mp3)"
    ),
    output_dir: str = typer.Option(
        "./output", "--output-dir", "-o", help="出力ディレクトリ"
    ),
    filename: Optional[str] = typer.Option(
        None, "--filename", help="出力ファイル名"
    ),
    model_version: str = typer.Option(
        "stereo-melody-large",
        "--model",
        "-m",
        help="MusicGenモデル (stereo-melody-large/stereo-large/melody-large/large)",
    ),
    seed: Optional[int] = typer.Option(
        None, "--seed", "-s", help="乱数シード（再現性のため）"
    ),
    fadeout: int = typer.Option(
        1000, "--fadeout", help="フェードアウトの長さ（ミリ秒、0で無効）"
    ),
):
    """テキストプロンプトからジングルを生成する"""
    config = load_config()
    backend = get_backend(config)

    request = GenerateRequest(
        prompt=prompt,
        duration=duration,
        output_format=output_format,
        model_version=model_version,
        seed=seed,
    )

    typer.echo(f"Generating jingle with {backend.name}...")
    typer.echo(f"  Prompt: {prompt}")
    typer.echo(f"  Duration: {duration}s")
    typer.echo(f"  Model: {model_version}")

    try:
        result = backend.generate(request)
    except Exception as e:
        error_msg = str(e)
        if "402" in error_msg or "Insufficient credit" in error_msg:
            typer.echo(
                "Error: Replicateのクレジットが不足しています。\n"
                "  https://replicate.com/account/billing#billing でクレジットを購入してください。",
                err=True,
            )
        else:
            typer.echo(f"Error: {error_msg}", err=True)
        raise typer.Exit(1)

    filepath = save_audio(result, output_dir, filename, fadeout_ms=fadeout)

    typer.echo(f"Done! Saved to: {filepath}")


def main():
    app()


if __name__ == "__main__":
    main()
