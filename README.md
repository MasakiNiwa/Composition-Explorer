# Composition Explorer

**数学と美術理論で、まだ見ぬ構図を発見する。**
Discover unseen compositions with math and art theory.

AIイラスト生成のための構図設計・探索ツールです。地平線・パース・人物・背景を視覚的に編集し、
構図ガイド画像（PNG / SVG）とパラメータ（JSON）を出力できます。

🌐 **アプリ**: https://masakiniwa.github.io/Composition-Explorer/
🧪 **Colab 版**: [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/MasakiNiwa/Composition-Explorer/blob/main/colab/Composition_Explorer_Colab.ipynb)

## 主な機能（v0.5）

- **構図エディター**（Phase 1）：アスペクト比、地平線（高さ・傾き・カメラ高）、1点/2点透視、人物シルエット、前景・中景・遠景、
  ドラッグ操作、Undo/Redo、自動保存、クリア、構図ガイド（三分割・黄金分割・対角線・中心線・黄金螺旋）、アイレベルの法則
- **数学的構図評価**（Phase 2）：9指標（三分割・黄金比・対称性・視覚的バランス・視線誘導・奥行き・余白・ダイナミズム・パース整合性）、
  評価プリセット、レーダーチャート、視覚的重心オーバーレイ、解説ノート
- **自動構図探索**（Phase 3）：固定/範囲/自由の探索条件と制約、Web Worker 並列処理、多様性を考慮した候補提示、
  Masterpiece ⇔ Discovery スライダー、シードによる完全な再現性
- **進化的探索**（Phase 4）：突然変異、選んだ候補からの再探索、お気に入り・探索履歴（IndexedDB）、候補の比較
- **AI 画像生成連携**（Phase 5）：PNG / SVG / JSON、深度マップ・セグメンテーション（ControlNet 向け）、構図プロンプト、Colab 版
- 設定（言語・テーマ・配色・出力サイズ・並列数・GPU・計算バックエンド）、ヘルプ、バージョン情報とクレジット
- スマートフォン / PC 対応、日本語 / 英語

ロードマップと設計は [docs/SPEC.md](docs/SPEC.md) を参照してください。

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm test           # 単体テスト
npm run lint
npm run build      # 本番ビルド（dist/）
npm run licenses   # 依存ライブラリのライセンス情報を再生成
```

依存ライブラリを追加・更新したら `npm run licenses` を実行し、`THIRD_PARTY_NOTICES.md` をコミットしてください。

### Colab 版

`colab/` のノートブックを Colab で実行すると、同じ UI が Colab 上で起動します。詳しくは [colab/README.md](colab/README.md)。

### デプロイ

`main` への push で GitHub Actions がビルドし GitHub Pages に公開します
（リポジトリの Settings → Pages → Source を **GitHub Actions** に設定してください）。

## ライセンス

- 本体：[MIT License](LICENSE)
- 利用ライブラリ：[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- 参考文献：[REFERENCES.md](REFERENCES.md)
