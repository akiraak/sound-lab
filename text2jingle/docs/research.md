# AI音楽（ジングル）生成サービス調査レポート

調査日: 2026-02-24

## 概要

テキストプロンプトからジングル（短い音楽）を生成できるAIサービス・APIを調査し、以下の観点で比較した:

- APIの提供状況
- 生成できる音楽の品質・長さ
- 料金体系
- プログラムからの利用しやすさ
- ジングル生成への適性
- 制限事項

---

# Part 1: オーディオ波形を直接生成する手法（OSSモデル）

テキスト（プロンプト）から直接、音色やエフェクトを含んだ音声ファイル（WAVやMP3など）を生成する手法。
最近のAIの進化により、最も高品質で手軽な方法となっている。
ローカル環境やクラウドサーバーにデプロイしてプログラムに組み込める。

---

## 1. Meta MusicGen（AudioCraft）

https://github.com/facebookresearch/audiocraft

テキストプロンプト（例: "Upbeat acoustic guitar jingle, 5 seconds"）から直接音楽を生成するオープンソースモデル。PythonとPyTorch環境があれば数十行のコードで実装可能。ジングル生成には最も手軽でバランスが良い。

### 基本情報

- **アーキテクチャ**: 自己回帰Transformer
- **サンプリングレート**: 32kHz モノラル
- **最大生成長**: 30秒
- **訓練データ**: 約20,000時間のライセンス済み音楽データ
- **ライセンス**: MIT（商用利用可）

### モデルバリエーション

| モデル | パラメータ | 特徴 |
|--------|-----------|------|
| musicgen-small | 300M | 軽量、高速 |
| musicgen-medium | 1.5B | バランス型 |
| musicgen-large | 3.3B | 高品質 |
| musicgen-melody | 1.5B | メロディ条件付け対応 |

### プログラムへの組み込み

```bash
pip install audiocraft
# または
pip install transformers torch
```

```python
from audiocraft.models import MusicGen
from audiocraft.data.audio import audio_write

model = MusicGen.get_pretrained("facebook/musicgen-small")
model.set_generation_params(duration=5)

descriptions = ["Upbeat acoustic guitar jingle, 5 seconds"]
wav = model.generate(descriptions)
audio_write("jingle", wav[0].cpu(), model.sample_rate)
```

Hugging Face transformers経由でも利用可能:

```python
from transformers import AutoProcessor, MusicgenForConditionalGeneration

processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")

inputs = processor(text=["Upbeat acoustic guitar jingle"], return_tensors="pt")
audio_values = model.generate(**inputs, max_new_tokens=256)
```

### メロディ条件付け

既存のメロディを基にした生成が可能（musicgen-melodyモデル）:

```python
model = MusicGen.get_pretrained("facebook/musicgen-melody")
wav = model.generate_with_chroma(descriptions, melody_wavs, model.sample_rate)
```

### 料金

- OSS: 完全無料（GPUコストのみ）
- Replicate経由: $0.064/回
- Hugging Face Inference: インスタンス時間課金

### ジングル適性: ★★★★

- 30秒以内のインスト生成に最適
- メロディ条件付けで既存メロディベースの生成が可能
- MITライセンスで商用利用可能

### 制限事項

- ボーカル生成不可
- GPU（VRAM 16GB以上）推奨
- 2023年リリース以降大きなアップデートなし

---

## 2. AudioLDM / AudioLDM 2

https://github.com/haoheliu/AudioLDM2

音楽だけでなく効果音（環境音、足音、爆発音など）の生成にも強い潜在拡散（Latent Diffusion）モデル。Hugging Faceのdiffusersライブラリ経由で簡単にPythonプログラムに組み込める。音楽的なジングルだけでなく、効果音的なサウンドロゴを作りたい場合に適している。

### 基本情報

- **アーキテクチャ**: 潜在拡散モデル（LDM）
- **テキストエンコーダ**: CLAP + Flan-T5（AudioLDM 2）
- **対応タスク**: 効果音 + 音楽 + 音声合成（TTS）を単一アーキテクチャで生成

### AudioLDM vs AudioLDM 2

| | AudioLDM (v1) | AudioLDM 2 |
|---|---|---|
| サンプリングレート | 16kHz | 16kHz（48kHz版あり） |
| デフォルト生成長 | 5.12秒 | 10.24秒 |
| パラメータ | - | 1.1B (base) / 1.5B (large) |
| 訓練データ | AudioCaps | 1,150k時間 |
| 音楽専用モデル | なし | あり（audioldm2-music） |

### モデルチェックポイント（Hugging Face）

| モデル | タスク | UNet | 訓練データ |
|--------|--------|------|-----------|
| cvssp/audioldm2 | 汎用音声 | 350M | 1,150k時間 |
| cvssp/audioldm2-large | 汎用音声 | 750M | 1,150k時間 |
| cvssp/audioldm2-music | 音楽専用 | 350M | 665k時間 |

### プログラムへの組み込み

```bash
pip install diffusers transformers accelerate torch scipy
```

```python
import scipy
import torch
from diffusers import AudioLDM2Pipeline

pipe = AudioLDM2Pipeline.from_pretrained("cvssp/audioldm2-music", torch_dtype=torch.float16)
pipe = pipe.to("cuda")

prompt = "Cheerful corporate jingle with piano and bells"
negative_prompt = "Low quality."

audio = pipe(
    prompt,
    negative_prompt=negative_prompt,
    num_inference_steps=200,
    audio_length_in_s=10.0,
    num_waveforms_per_prompt=3,  # 複数候補を生成しCLAPスコアで自動ランク付け
).audios

scipy.io.wavfile.write("jingle.wav", rate=16000, data=audio[0])
```

高速化版（DPMSolverで200→20ステップ、1秒未満で生成）:

```python
from diffusers import AudioLDM2Pipeline, DPMSolverMultistepScheduler

pipe = AudioLDM2Pipeline.from_pretrained("cvssp/audioldm2", torch_dtype=torch.float16)
pipe.to("cuda")
pipe.unet = torch.compile(pipe.unet, mode="reduce-overhead", fullgraph=True)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)

audio = pipe("Upbeat jingle", negative_prompt="Low quality.", num_inference_steps=20).audios[0]
```

### 推論速度（GPU上、10.24秒音声）

| 構成 | 推論時間 | ステップ数 |
|------|---------|-----------|
| float32, DDIM | ~13-14秒 | 200 |
| float16 | ~9秒 | 200 |
| float16 + torch.compile | ~4秒 | 200 |
| float16 + torch.compile + DPMSolver | **< 1秒** | 20 |

### GPU要件

| 条件 | 推定VRAM |
|------|---------|
| base, float32 | ~8-10 GB |
| base, float16 | ~4-6 GB |
| large, float16 | ~8-10 GB |
| CPU offload使用時 | ~3-4 GB GPU + CPU RAM |

### 料金

- OSS: 完全無料（GPUコストのみ）
- Replicate経由: ~$0.022/回
- ライセンス: **CC BY-NC-SA 4.0（非商用のみ）**

### ジングル適性: ★★★

- 短い音楽片（5-10秒）の生成に適している
- 効果音と音楽の両方を一つのモデルで生成可能（サウンドロゴ向き）
- 16kHzサンプリングレートは商用品質としてはやや低い（MusicGenは32kHz）
- メロディ制御機能なし
- **非商用ライセンス**が最大のネック

### MusicGenとの比較

| 観点 | AudioLDM 2 | MusicGen |
|------|-----------|---------|
| サンプリングレート | 16kHz | **32kHz** |
| 対応タスク | 効果音+音楽+TTS | 音楽のみ |
| メロディ条件付け | 不可 | **対応** |
| ライセンス | CC BY-NC-SA 4.0 | **MIT（商用可）** |
| 推論速度（最適化時） | **< 1秒** | 数秒〜十数秒 |
| 音楽品質メトリクス | FAD/KL/CLAPで3.4%優位 | やや劣る |

**使い分け**: 効果音的なサウンドロゴ → AudioLDM 2、音楽的なジングル → MusicGen

---

## 3. Stable Audio Open（Stability AI）

https://huggingface.co/stabilityai/stable-audio-open-1.0

高品質な音楽生成が可能なモデルのオープンソース版。秒数を指定して生成する機能に長けているため、秒数制限がシビアなジングル制作に向いている。

### 基本情報

- **アーキテクチャ**: 潜在拡散モデル
- **サンプリングレート**: 44.1kHz ステレオ
- **最大生成長**: 47秒
- **訓練データ**: Creative Commons音声データ
- **ライセンス**: 非商用（Open版）

### プログラムへの組み込み

Hugging Face diffusers経由:

```python
import torch
from diffusers import StableAudioPipeline

pipe = StableAudioPipeline.from_pretrained(
    "stabilityai/stable-audio-open-1.0", torch_dtype=torch.float16
)
pipe = pipe.to("cuda")

prompt = "Corporate jingle, upbeat, 10 seconds"
negative_prompt = "Low quality."

audio = pipe(
    prompt,
    negative_prompt=negative_prompt,
    num_inference_steps=200,
    audio_end_in_s=10.0,
).audios
```

### ジングル適性: ★★★★

- **44.1kHzステレオ**はCD品質で、3つのOSSモデルの中で最高音質
- 秒数指定が可能で、ジングルの長さを正確に制御できる
- 効果音よりも音楽生成に向いている

### 制限事項

- Open版は非商用ライセンス
- ボーカル生成不可
- 商用版（Stable Audio 2.5）はAPI経由で利用可能（後述）

---

## OSSモデル比較まとめ

| モデル | サンプリングレート | 最大長 | ボーカル | メロディ条件付け | ライセンス | 主な用途 |
|--------|-------------------|--------|---------|----------------|-----------|---------|
| **MusicGen** | 32kHz | 30秒 | 不可 | **対応** | **MIT** | 音楽ジングル |
| **AudioLDM 2** | 16kHz | 拡張可 | 不可 | 不可 | CC BY-NC-SA | 効果音+サウンドロゴ |
| **Stable Audio Open** | **44.1kHz** | 47秒 | 不可 | 不可 | 非商用 | 高音質ジングル |

**推奨**: 商用利用 → MusicGen（MIT）、高音質が必要 → Stable Audio Open、効果音も必要 → AudioLDM 2

---

# Part 2: クラウドAPI サービス

プログラムからAPIを呼び出して利用するサービス。セットアップが簡単で、GPU不要。

---

## 4. Suno AI

https://suno.com

- **API**: 公式APIなし。サードパーティ（PiAPI, APIFrame, sunoapi.org等）で非公式APIあり
- **品質**: 最新モデル v5（2025年9月）。スタジオグレード音質、リアルなボーカル付き
- **長さ**: 無料最大2分、有料最大8分
- **料金**:
  - Free: $0（50クレジット/日、商用不可）
  - Pro: $10/月（2,500クレジット/月、商用可）
  - Premier: $30/月（10,000クレジット/月、商用可）
- **SDK**: なし（非公式REST APIのみ）
- **ジングル適性**: ★★★★。プロンプトで「30秒のジングル」等と指定可能。ボーカル付きに強い
- **制限**: 公式APIなし（最大のネック）。Warner Musicと和解・提携済み

---

## 5. Udio

https://www.udio.com

- **API**: 公式APIなし。サードパーティ（udioapi.pro, MusicAPI.ai等）で利用可能
- **品質**: 高品質。デフォルト33秒のクリップ生成
- **長さ**: デフォルト33秒、最大15分（拡張機能）
- **料金**:
  - Free: $0（10クレジット/日 + 月100）
  - Standard: $10/月（2,400クレジット/月、商用可）
  - Pro: $30/月（6,000クレジット/月、商用可）
- **SDK**: なし（非公式REST APIのみ）
- **ジングル適性**: ★★★★。デフォルト33秒生成はジングルに最適な長さ
- **制限**: 公式APIなし。UMGと和解・提携済み

---

## 6. Google Lyria（MusicFX / MusicLM後継）

https://ai.google.dev/gemini-api/docs/music-generation

- **API**: 公式APIあり（複数）
  - **Lyria RealTime**: Gemini API経由。WebSocketでリアルタイムストリーミング
  - **Lyria 2 (lyria-002)**: Vertex AI経由。allowlist制（申請必要）
  - **Lyria 3**: 2026年2月発表。API提供は今後の予定
- **品質**: 48kHzステレオ（RealTime）。インストゥルメンタル中心
- **長さ**: RealTimeはセッション最大10分、Lyria 2は30秒単位
- **料金**:
  - Lyria RealTime: 無料ティアあり
  - Lyria 2: $0.06/30秒
- **SDK**: Google公式SDK（Python等）、REST API、WebSocket対応
- **ジングル適性**: ★★★。Lyria 2の30秒単位はジングル向き。RealTimeはBGM向き
- **制限**: Lyria 2はallowlist制。インストのみ（Lyria 3で歌詞対応予定）。SynthID電子透かし付き

---

## 7. Stable Audio 2.5（商用API版）

https://platform.stability.ai

- **API**: 公式REST APIあり（2025年9月リリース）
- **品質**: 44.1kHzステレオ。マルチパート構成（イントロ・展開・アウトロ）対応。GPUで2秒以下の推論
- **長さ**: 最大3分
- **料金**: クレジット制（1クレジット=$0.01）。新規25無料クレジット
- **SDK**: REST API、Python SDK、Replicate/fal.ai/ComfyUI対応
- **ジングル適性**: ★★★★。マルチパート構成の短い楽曲に適している
- **制限**: ボーカル不可。完全ライセンス済みデータで商用可

---

## 8. ElevenLabs Music（Eleven Music）

https://elevenlabs.io/music

- **API**: 公式REST APIあり（2025年8月公開）
- **品質**: MP3（44.1kHz、128-192kbps）。歌詞付き楽曲、スタイル・構造制御可能
- **長さ**: 最小3秒〜最大5分
- **料金**: 有料プランのみ。楽曲生成ごとの課金（トラック長・バリエーション数に依存）
- **SDK**: 公式REST API、Python SDK、包括的なドキュメント
- **ジングル適性**: ★★★★★。3秒からの生成が可能。歌詞付き/インスト両対応。インペインティングで微調整可能
- **制限**: 無料枠なし。ライセンス済みデータ学習で広範な商用利用許可（映画、TV、広告等）

---

## 9. OpenAI

- **API**: 音楽生成APIは未提供（2026年2月時点）
- **状況**: 2025年10月に音楽生成ツール開発中との報道。ジュリアード音楽院と協力中
- **ジングル適性**: 現時点では利用不可

---

## 10. Mubert

https://mubert.com

- **API**: 公式APIあり（Mubert API 3.0）
- **品質**: リアルタイムAI音楽生成。ミュージシャン提供サンプルの組み合わせ
- **長さ**: ストリーミング型
- **料金**:
  - Trial: $49/月
  - Creator: $19-$49/月（最大100,000 APIコール）
  - Pro: $99〜/月
  - テスト用1,000 APIコール無料
- **SDK**: REST API
- **ジングル適性**: ★★。ストリーミング・BGM向き。完結した1曲のジングル生成は他の方が適切
- **制限**: 最低$49/月。サンプルベースのため完全なAI生成とは異なる

---

## 11. AIVA

https://www.aiva.ai

- **API**: カスタム契約のみ（公開APIなし）
- **品質**: クラシック・シネマティック等250以上のスタイル
- **料金**: Free（帰属表示必須）、Standard（限定収益化）、Pro（著作権所有）
- **SDK**: なし（個別交渉必要）
- **ジングル適性**: ★★★。高品質インスト楽曲に強いが、API経由での自動生成には不向き
- **制限**: 公開APIなし

---

## 12. Soundverse

https://www.soundverse.ai

- **API**: 公式APIあり（エンタープライズ向け）
- **品質**: テキスト/MIDI/メロディ/リファレンスオーディオから生成。ボーカル対応
- **料金**:
  - Starter: $99/月（1,980曲）
  - Growth: $599/月
  - Scale: $5,999/月
- **SDK**: REST API
- **ジングル適性**: ★★★★。短いミュージッククリップに対応
- **制限**: 最低$99/月。ロイヤリティフリーライセンス付き

---

# Part 3: 総合比較

## 全サービス比較表

| # | サービス | 種別 | 公式API | 無料枠 | 最長 | ボーカル | 商用利用 | ジングル適性 | Python |
|---|----------|------|---------|--------|------|---------|---------|-------------|--------|
| 1 | MusicGen | OSS | - | 完全無料 | 30秒 | 不可 | MIT | ★★★★ | audiocraft |
| 2 | AudioLDM 2 | OSS | - | 完全無料 | 拡張可 | 不可 | CC BY-NC-SA | ★★★ | diffusers |
| 3 | Stable Audio Open | OSS | - | 完全無料 | 47秒 | 不可 | 非商用 | ★★★★ | diffusers |
| 4 | Suno AI | Cloud | なし | あり(制限) | 8分 | 可 | Pro以上 | ★★★★ | なし |
| 5 | Udio | Cloud | なし | あり(制限) | 15分 | 可 | Standard以上 | ★★★★ | なし |
| 6 | Google Lyria | Cloud | あり | あり | 10分 | 限定的 | 要確認 | ★★★ | あり |
| 7 | Stable Audio 2.5 | Cloud | あり | 25cr | 3分 | 不可 | 可 | ★★★★ | あり |
| 8 | ElevenLabs | Cloud | あり | なし | 5分 | 可 | 可(広範) | ★★★★★ | あり |
| 9 | Mubert | Cloud | あり | 1,000回 | 無限 | 不可 | プラン依存 | ★★ | REST |
| 10 | AIVA | Cloud | 個別契約 | あり(制限) | - | 不可 | Pro | ★★★ | なし |
| 11 | Soundverse | Cloud | あり | なし | - | 可 | 可 | ★★★★ | REST |

## 推奨Tier

### Tier 1: OSSモデル（ローカル実行、無料、実験に最適）

1. **MusicGen** - ジングル生成に最もバランスが良い。MITライセンスで商用可。メロディ条件付け対応。`pip install audiocraft`で即利用可能
2. **Stable Audio Open** - 44.1kHz最高音質。秒数指定が正確。ただし非商用ライセンス
3. **AudioLDM 2** - 効果音+音楽の両方に対応。サウンドロゴ向き。非商用ライセンス

### Tier 2: クラウドAPI（公式API + 高品質 + 商用利用可）

4. **ElevenLabs Music** - 3秒〜生成可能でジングルに最適。公式API/Python SDK完備。有料プラン必須
5. **Google Lyria 2 (Vertex AI)** - Google公式エコシステム。$0.06/30秒。allowlist制
6. **Stable Audio 2.5** - 公式REST API/SDK。マルチパート構成に強い

### Tier 3: 高品質だがAPI制約あり

7. **Suno AI** - 品質トップクラスだが公式APIなし。サードパーティ依存のリスクあり
8. **Udio** - 同上。33秒デフォルトはジングル向きだが公式API未提供
