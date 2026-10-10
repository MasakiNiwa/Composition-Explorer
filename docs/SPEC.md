# Composition Explorer — 仕様書 (Specification)

> 数学と美術理論で、まだ見ぬ構図を発見する。

本書は企画書 Ver.1.0 をもとに、実装の前提となる仕様・技術選定・設計方針をまとめたものです。
フェーズごとに更新します。

## 1. 技術選定

| 領域 | 採用 | 理由 |
| --- | --- | --- |
| 言語 | TypeScript | 型による保守性。コアロジックを UI から分離しやすい |
| UI | React 19 + Mantine 9 | 豊富なコンポーネント、ダークモード、レスポンシブ (AppShell) |
| ビルド | Vite | 高速、Web Worker のバンドルを標準サポート |
| 状態管理 | Zustand (+ persist / zundo) | 軽量。自動保存と Undo/Redo |
| ルーティング | React Router (HashRouter) | GitHub Pages / Colab のプロキシ下でもサーバー設定不要 |
| 多言語 | i18next | 日本語 / 英語 |
| スキーマ検証 | Zod | JSON 読込時の検証とマイグレーション |
| 描画 | 独自 Scene → SVG | 描画プリミティブを中間表現にして、エディター・サムネイル・PNG/SVG 出力を共通化 |
| 並列計算 | Web Workers + Comlink (Phase 3) | 探索処理を UI スレッドから分離し、コア数に応じて並列化 |
| GPU | WebGPU (実測で効果がある処理から) | 設定画面で対応状況を表示、オン/オフ可能 |
| 保存 | localStorage → IndexedDB (idb-keyval, Phase 4) | 履歴・お気に入りなど大きなデータ用 |
| テスト | Vitest | コア（評価・探索）の単体テスト |
| 公開 | GitHub Actions → GitHub Pages | main への push で自動デプロイ |

Konva.js も候補でしたが、SVG 出力・サムネイル共通化・Python (Colab) 側での再実装容易性から、
レンダラー非依存のプリミティブ中間表現 + SVG を採用しました。

## 2. アーキテクチャ

```
src/
  core/            ← DOM 非依存の純粋 TS（Worker / テスト / 将来 Python 版と共有する仕様）
    model/         構図データモデル・Zod スキーマ・バージョン
    geometry/      ベクトル、カメラ（ロール・アイレベル・消失点）
    random/        シード付き PRNG (sfc32)
    scene/         Composition → 描画プリミティブ
    evaluation/    (Phase 2) 評価エンジン群
    exploration/   (Phase 3) 探索・多様性選択
  compute/         (Phase 3) ComputeBackend: LocalWorkerBackend / RemoteColabBackend
  render/          プリミティブ → SVG 文字列、PNG/SVG/JSON 出力
  state/           Zustand ストア（構図・表示・設定）
  components/      UI 部品（エディター、レイアウト）
  pages/           エディター / 設定 / ヘルプ / バージョン情報
colab/             (Phase 5) Colab ノートブックとサーバー
```

### 2.1 座標系

- 位置は正規化座標（x: 0=左〜1=右、y: 0=上〜1=下）。
- 大きさはキャンバス高さに対する比率（アスペクト比を変えても形が崩れない）。
- オブジェクトは「ワールド座標」（カメラロール適用前）に置かれ、地平線の傾き＝カメラロールでキャンバス中心周りに回転して画面になる。

### 2.2 数学的な前提

- **アイレベルの法則**：平らな地面では、地平線はカメラの高さで全ての立っている人物を横切る。
  接地位置 y_f、地平線 y_h、カメラ高 h_c、身長 H_p のとき、画面上の身長 = (y_f − y_h)·H_p / h_c。
- **消失点**は常に地平線上。1点透視の奥行き線は y = y_h + k/d（等間隔の奥行き d）。
- 建物は 1点 / 2点透視の箱として消失点へ収束する辺で描く。

### 2.3 再現性

JSON に `schemaVersion` と `seed` を含める。探索は `(条件, seed, エンジンバージョン)` から決定的に再現する。

### 2.4 Colab 連携（将来）

- ビルドは `base: './'` の相対パスで、GitHub Pages と Colab のカーネルプロキシの両方で同じ成果物が動く。
- `ComputeBackend` インターフェイスでローカル Worker と Colab（Python, GPU）を差し替える。
  Colab 版では同じ UI を配信し、URL パラメータでバックエンド API の場所を受け取る。

## 3. フェーズ

| Phase | 内容 | 状態 |
| --- | --- | --- |
| 1 | 構図エディター（キャンバス、地平線、パース、人物、前景/中景/遠景、PNG/SVG/JSON、設定/ヘルプ/バージョン情報、クリア） | ✅ v0.1 |
| 2 | 数学的構図評価（三分割、黄金比、対称性、視覚的重心、視線誘導、奥行き、余白、ダイナミズム、パース整合性、プリセット、可視化） | ✅ v0.2 |
| 3 | 自動探索（Fixed/Range/Free、シード付き生成、制約、Worker 並列、多様性選択、Masterpiece⇔Discovery） | ✅ v0.3 |
| 4 | 進化的探索（選択構図から再探索、突然変異、履歴、お気に入り、NSGA-II） | 予定 |
| 5 | AI 生成連携（深度マップ等の出力）、Colab Edition | 予定 |

## 4. ライセンス管理

- 本体：MIT（`LICENSE`）
- 依存ライブラリ：`npm run licenses` が `THIRD_PARTY_NOTICES.md` と アプリ内クレジット用 JSON を生成。
  許可リスト外（GPL 等・不明）のライセンスがあるとビルドが失敗する。`npm run build` は
  `THIRD_PARTY_NOTICES.md` が最新であることも検査する。
- 参考研究：`REFERENCES.md`（アイデアのみ参照、コード・データセットは不使用）

## 5. Composition Engine（Phase 2）

`src/core/evaluation/` — DOM 非依存。`evaluate(composition, preset)` が 0〜100 の 9 指標・総合値・解説ノートを返す。
特徴量抽出は解析的（描画プリミティブを生成しない）で、探索時に Worker 内で大量に実行できる。

| 指標 | 定義（概要） |
| --- | --- |
| thirds / golden | 主役の注目点と交点・分割線、地平線と分割線の距離をガウス関数で評価 |
| symmetry | 24×24 の視覚的重みグリッドの左右鏡像差。ロールで減衰、中央の 1 点透視で加点 |
| balance | 重み付き重心（面積×注目度×レイヤー係数）と中心の距離 |
| flow | 消失点→主役の距離、対角線上の配置、人物の視線方向の余白（ルッキングルーム） |
| depth | 前景/中景/遠景の有無、透視の有無、近遠の大きさの対数比 |
| negativeSpace | 実体オブジェクト（空・雲・山を除く）に覆われていない割合 |
| dynamics | ロール、非対称性、パースの強さ、対角線配置 |
| perspective | アイレベル法則からの対数誤差、地面オブジェクトの接地位置 |

プリセットは指標の重み。負の重みは「その指標が低いほど高評価」を意味し、Experimental などに使う。
`ENGINE_VERSION` は再現性キーの一部で、指標定義を変えたら上げる。

## 6. Composition Explorer（Phase 3）

`src/core/exploration/`（純粋 TS）＋ `src/compute/`（実行環境）。

1. **生成** `generateCandidate(template, spec, rng)`：現在の構図をテンプレートに、Fixed/Range/Free に従ってパラメータを標本化。
   ロックしたオブジェクトは固定。Discovery が高いと Free パラメータが範囲の端（大胆な値）を取りやすくなる。
2. **評価** Phase 2 の `computeMetrics`。制約（空の最小面積・中央回避・注目点を画面内）違反は除外。
3. **目的関数** `objective = (1−d)·preset + d·(0.5·experimental + 0.5·novelty)`（d = Discovery）。
   novelty はテンプレートとの特徴ベクトル距離。
4. **多様性選択** MMR（Maximal Marginal Relevance）：`(1−λ)·objective + λ·最近傍候補との距離`、λ = 多様性。近似重複は除外。
5. **並列化** 250 件固定のチャンクを Web Worker プール（Comlink）に配布。各チャンクの上位 K 件を統合するため、
   **結果はワーカー数に依存せず**、`(構図, 条件, seed, ENGINE_VERSION)` から完全に再現できる。
   候補ごとの乱数シードは `hash(seed, index)`。
6. **ComputeBackend** インターフェイス：現在は `LocalWorkerBackend`。Colab 版ではこれを Python サーバーに差し替える。
