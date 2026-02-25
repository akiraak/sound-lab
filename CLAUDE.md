# Sound Lab

音に関するさまざまなプログラムを作成・実験するためのプロジェクト。

## プロジェクト概要

- 音声処理、音響解析、音楽生成など、音に関連する実験的なプログラムを集めたリポジトリ
- ライセンス: MIT (Copyright 2026 Akira Kozakai)

## 開発方針

- 各実験・プログラムはディレクトリごとに分離して管理する
- 日本語でコミュニケーションを行う
- シンプルで読みやすいコードを心がける
- プロジェクト全体を網羅するWebインターフェースを構築予定

## プロジェクト一覧

### text2jingle
- テキストプロンプトからAIを使ってジングル（短い音楽）を生成するCLIツール
- Python 3.11+ / Replicate API / MusicGen
- `cd text2jingle && source .venv/bin/activate && text2jingle "プロンプト"`
- バックエンド差し替え可能（`backends/base.py` の MusicBackend ABC を継承）
- 調査ドキュメント: `text2jingle/docs/research.md`
