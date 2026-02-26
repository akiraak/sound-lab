# Sound Lab

音に関するさまざまなプログラムを作成・実験するためのプロジェクト。

## 概要

音声処理、音響解析、音楽生成など、音に関連する実験的なプログラムを集めたリポジトリです。
各実験・プログラムはディレクトリごとに分離して管理しています。

## ツール一覧

### text2jingle — AI ジングル生成 CLI

テキストプロンプトからAIを使ってジングル（短い音楽）を生成するCLIツール。

- Python 3.11+ / Replicate API / MusicGen
- バックエンド差し替え可能（`backends/base.py` の MusicBackend ABC を継承）
- プロンプト自動最適化、フェードアウト処理

```bash
cd text2jingle && source .venv/bin/activate
text2jingle "upbeat corporate jingle, 8-bit style"
```

### web-synth — ブラウザシンセサイザー

PCキーボード・マウスで演奏できるWeb Audio APIベースのシンセサイザー。

- 4波形（Sine / Square / Sawtooth / Triangle）、ポリフォニック対応
- エフェクト: Filter（LP/HP/BP）、Delay、Reverb
- 3オクターブ鍵盤表示、矢印キーでオクターブ移動
- 各機能にツールチップヘルプ付き

### web — 統合 Web UI

すべてのツールを統合するWebインターフェース。

- FastAPI + Jinja2 + HTMX + TailwindCSS CDN
- サイドバーからツール切替、設定画面（APIキー管理）
- text2jingle連携: 非同期ジョブ管理、生成履歴
- 設定はSQLiteで永続化（`data/settings.db`）

```bash
cd web && source .venv/bin/activate
soundlab-web
# → http://localhost:8000
```

## ライセンス

MIT (Copyright 2026 Akira Kozakai)
