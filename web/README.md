# Sound Lab Web UI

Sound Labプロジェクト全体を網羅する統合Webインターフェース。

## セットアップ

```bash
cd web
python3 -m venv .venv
source .venv/bin/activate
pip install -e ../text2jingle   # text2jingleを先にインストール
pip install -e .
```

## 設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
# .env を編集して REPLICATE_API_TOKEN を設定
```

## 起動

```bash
soundlab-web
```

ブラウザで http://localhost:8000 にアクセス。

## 環境変数

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `REPLICATE_API_TOKEN` | Yes | - | Replicate APIトークン |
| `SOUNDLAB_HOST` | No | `0.0.0.0` | バインドホスト |
| `SOUNDLAB_PORT` | No | `8000` | ポート番号 |
