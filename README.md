# Composition Explorer

**数学と美術理論で、まだ見ぬ構図を発見する。**
Discover unseen compositions with math and art theory.

AIイラスト生成のための構図設計・探索ツールです。地平線・パース・人物・背景を視覚的に編集し、
構図ガイド画像（PNG / SVG）とパラメータ（JSON）を出力できます。

🌐 **アプリ**: https://masakiniwa.github.io/Composition-Explorer/

## 主な機能（v0.1 / Phase 1）

- 構図エディター：アスペクト比、地平線（高さ・傾き・カメラ高）、1点/2点透視、人物シルエット、前景・中景・遠景オブジェクト
- ドラッグ操作（移動・拡大縮小・地平線・ロール・消失点）、Undo / Redo、自動保存、クリア
- 構図ガイド：三分割、黄金分割、対角線、中心線、黄金螺旋
- アイレベルの法則による人物サイズの自動調整
- PNG / SVG / JSON 出力、JSON 読込（シード付きで再現可能）
- 設定（言語・テーマ・配色・出力サイズ・並列数・GPU）、ヘルプ、バージョン情報とクレジット
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

### デプロイ

`main` への push で GitHub Actions がビルドし GitHub Pages に公開します
（リポジトリの Settings → Pages → Source を **GitHub Actions** に設定してください）。

## ライセンス

- 本体：[MIT License](LICENSE)
- 利用ライブラリ：[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- 参考文献：[REFERENCES.md](REFERENCES.md)
