# Sound Lab

音に関するさまざまなプログラムを作成・実験するためのプロジェクト。

## プロジェクト概要

- 音声処理、音響解析、音楽生成など、音に関連する実験的なプログラムを集めたリポジトリ
- ライセンス: MIT (Copyright 2026 Akira Kozakai)

## 開発方針

- 各実験・プログラムはディレクトリごとに分離して管理する
- 日本語でコミュニケーションを行う
- シンプルで読みやすいコードを心がける
- TODO.mdで完了した項目（`[x]`）はDONE.mdに移動する
- コミット時に関連するドキュメント（TODO.md, DONE.md, CLAUDE.md, README.md）も併せて更新する

## ドキュメント

| ファイル | 内容 |
|---------|------|
| `README.md` | プロジェクト全体の紹介・セットアップ手順 |
| `CLAUDE.md` | AI向け開発指針・プロジェクト構造（本ファイル） |
| `TODO.md` | 未完了タスク一覧 |
| `DONE.md` | 完了タスク一覧（TODO.mdから移動） |
| `text2jingle/README.md` | text2jingleの使い方・設定 |
| `text2jingle/docs/research.md` | AI音楽生成サービスの調査・比較 |
| `web/README.md` | Web UIの使い方・開発ガイド |

## プロジェクト一覧

### text2jingle
- テキストプロンプトからAIを使ってジングル（短い音楽）を生成するCLIツール
- Python 3.11+ / Replicate API / MusicGen
- `cd text2jingle && source .venv/bin/activate && text2jingle "プロンプト"`
- バックエンド差し替え可能（`backends/base.py` の MusicBackend ABC を継承）
- 調査ドキュメント: `text2jingle/docs/research.md`

### web（統合Web UI）
- プロジェクト全体を網羅するWebインターフェース
- FastAPI + Jinja2 + HTMX + TailwindCSS CDN
- `cd web && source .venv/bin/activate && soundlab-web` → http://localhost:8000
- text2jingleをimportして再利用（非同期ジョブ管理、履歴機能付き）
- 新ツール追加時は `routers/` + `services/` + `templates/tools/` に追加
