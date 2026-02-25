# text2jingle

テキストプロンプトからAI（MusicGen）を使ってジングルを生成するCLIツール。

## セットアップ

```bash
cd text2jingle
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## 設定

`.env.example` をコピーして `.env` を作成し、Replicate APIトークンを設定する:

```bash
cp .env.example .env
# .env を編集して REPLICATE_API_TOKEN を設定
```

Replicate APIトークンは https://replicate.com/account/api-tokens から取得できる。

## 使い方

```bash
# 基本的な使い方
text2jingle "Upbeat acoustic guitar jingle, cheerful and bright"

# 長さを指定（秒）
text2jingle "Corporate intro jingle with piano" --duration 5

# MP3形式で出力
text2jingle "Energetic rock jingle" --format mp3

# 出力先を指定
text2jingle "Calm ambient jingle" -o ./my_jingles

# モデルを指定 (melody/large/small)
text2jingle "Epic orchestral jingle" --model large

# シードを指定（再現性のため）
text2jingle "Jazz jingle with saxophone" --seed 42
```

## 環境変数

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `REPLICATE_API_TOKEN` | Yes | - | Replicate APIトークン |
| `TEXT2JINGLE_BACKEND` | No | `replicate-musicgen` | 使用するバックエンド |
| `TEXT2JINGLE_DURATION` | No | `8` | デフォルトの生成長（秒） |
| `TEXT2JINGLE_FORMAT` | No | `wav` | デフォルトの出力フォーマット |
| `TEXT2JINGLE_OUTPUT_DIR` | No | `./output` | デフォルトの出力ディレクトリ |
