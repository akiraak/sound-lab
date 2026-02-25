# DONE

## text2jingle

- [x] AI音楽生成サービスの調査・比較（12サービス）
- [x] 調査ドキュメント作成（`text2jingle/docs/research.md`）
- [x] 技術選定: MusicGen（Phase 1）→ ElevenLabs Music（Phase 2）
- [x] MusicGen（Replicate API経由）CLIツール実装
- [x] バックエンドを差し替え可能な抽象化設計（MusicBackend ABC）
- [x] プロンプト自動最適化（長さ・終了ヒント付加）
- [x] フェードアウト処理（pydub、`--fadeout` オプション）

## web（統合Web UI）

- [x] FastAPI + HTMX + TailwindCSSでWeb UI構築
- [x] ダッシュボード（ツール一覧）
- [x] ジングル生成フォーム + 非同期ジョブ管理（ポーリング）
- [x] 音声プレイヤー + ダウンロード
- [x] 生成履歴（JSONファイルベース）
- [x] ツール一覧を左ペイン（サイドバー）に常時表示

## web-synth

- [x] PCのキーボードで演奏できるシンセサイザー（Web Audio API）
  - 4波形（Sine/Square/Sawtooth/Triangle）
  - ポリフォニック対応、オクターブ切替
  - ビジュアルピアノ鍵盤 + PCキーボード操作
- [x] エフェクト追加（Filter / Delay / Reverb）
  - Filter: LP/HP/BP切替、Frequency、Q制御
  - Delay: Time、Feedback、Dry/Wetミックス
  - Reverb: JS生成インパルスレスポンス、Decay、Dry/Wetミックス
- [x] 各機能にヘルプ（ツールチップ/説明テキスト）を追加
- [x] 3オクターブ鍵盤表示（マウスで全鍵盤演奏可、PCキーボードは中央オクターブ操作）
