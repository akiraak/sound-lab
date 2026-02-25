# Sound Lab

音に関するさまざまなプログラムを作成・実験するためのプロジェクト。

## 概要

音声処理、音響解析、音楽生成など、音に関連する実験的なプログラムを集めたリポジトリです。
各実験・プログラムはディレクトリごとに分離して管理しています。

## プロジェクト一覧

### text2jingle

テキストプロンプトからAIを使ってジングル（短い音楽）を生成するCLIツール。

- Python 3.11+ / Replicate API / MusicGen
- バックエンド差し替え可能（`backends/base.py` の MusicBackend ABC を継承）

```bash
cd text2jingle && source .venv/bin/activate && text2jingle "プロンプト"
```

### web（統合Web UI）

プロジェクト全体を網羅するWebインターフェース。

- FastAPI + Jinja2 + HTMX + TailwindCSS CDN
- text2jingleをimportして再利用（非同期ジョブ管理、履歴機能付き）
- 新ツール追加時は `routers/` + `services/` + `templates/tools/` に追加

```bash
cd web && source .venv/bin/activate && soundlab-web
# → http://localhost:8000
```

## ライセンス

MIT
