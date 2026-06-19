# Agequake — 鍼灸院向けLP（整巡湯 無料サンプル申し込みサイト）

## 本番URL
- **メイン**: https://agequake.jp → lp-shinkyu.html へ自動リダイレクト
- **LP直URL**: https://agequake.jp/lp-shinkyu.html

## デプロイ構成
- GitHub: `github.com/Agequake/agequake-website`（mainブランチ）
- Netlify: Push → 自動デプロイ（通常1〜2分で反映）
- `_redirects` により `agequake.jp/` → `lp-shinkyu.html` へ301リダイレクト済み

---

## ページ構成（公開中）

| ファイル | URL | 役割 |
|---|---|---|
| lp-shinkyu.html | agequake.jp/lp-shinkyu.html | メインLP（鍼灸院向け整巡湯無料サンプル申し込み） |
| form.html | agequake.jp/form.html | 無料サンプル申し込みフォーム |
| company.html | agequake.jp/company.html | 会社概要 |
| legal.html | agequake.jp/legal.html | 特定商取引法に基づく表記 |
| privacy.html | agequake.jp/privacy.html | プライバシーポリシー |

---

## 使用画像一覧

| ファイル | 用途 |
|---|---|
| logo-mark.png | ヘッダー・フッターのロゴマーク（Aマーク） |
| logo-text.png | ヘッダー・フッターのロゴテキスト（AGEQUAKE MANAGEMENT CONSULTING） |
| lp-shinkyu-hero.png | Section01背景（白衣の施術者） |
| lp-shinkyu-slide1.jpg | Heroスライダー①（町の空撮） |
| lp-shinkyu-slide2.jpg | Heroスライダー②（整巡湯パッケージ） |
| lp-shinkyu-slide3.jpg | Heroスライダー③（和のフラットレイ） |
| lp-shinkyu-market.jpg | Section04背景（市場グラフ） |
| lp-shinkyu-seijunto.png | Section05 整巡湯商品画像 |
| lp-shinkyu-seijunto-scene2.jpg | Section05背景（整巡湯を温泉に注ぐシーン） |
| lp-shinkyu-avatar-a/b/c.jpg | お客様の声のアバター写真 |
| flow-sample.jpg | Section06背景（整巡湯サンプル・導入ガイド） |

---

## 外部連携

### Netlify Forms（フォームデータ収集）
- フォーム名: `sample-form`
- 管理画面: app.netlify.com → フォーム → sample-form
- メール通知: 申し込みがあると `agequake@outlook.com` に自動送信
- CSVエクスポート: 管理画面から「Download CSV」でExcel管理可能
- 無料枠: 月100件まで

### Google Analytics 4（訪問者解析）
- 測定ID: `G-NHNKTPSDZG`
- 設置ページ: 全5ページ（`<head>`内にGAタグ追加済み）
- 確認方法: analytics.google.com → レポート → ウェブ/アプリのトラフィック

---

## ローカル確認方法

```powershell
.\serve.ps1 -Port 3600
```
→ http://localhost:3600/lp-shinkyu.html

※ `.claude/launch.json` でポート3600に設定済み。Claude Codeのプレビュー機能も使用可。

---

## デザイン仕様

### カラー
- ネイビー: `#0d1b2a` / `#1a1a2e` / `#0f3460`
- ゴールド: `#c9a84c` / `#a8893c`
- クリーム: `#faf8f3`

### セクション背景画像パターン（`.sec-with-image`）
- セクションに `sec-with-image` クラスを追加
- 本文を `.sec-text`（max-width:720px）で囲む
- `<div class="sec-image" style="background-image:url('...');">` を末尾に追加
- `::after` の `linear-gradient` でテキスト側を不透明に
- モバイル（max-width:768px）では `.sec-image { display: none; }`

### FLOWセクション背景（`.sec-flow-bg`）
- 通常の `.sec-image` パターンではなく `<img>` 要素で実装
- `.sec-flow-bg` が右56%を占め、`object-position: left center` で導入ガイドを表示
- モバイルでは非表示

---

## 会社概要・事業方針

### 会社
Agequake（エイジクエイク）／代表: 新堀 博
所在地: 大阪府茨木市総持寺10
メール: agequake@outlook.com

### ミッション
社会課題を、持続可能な仕組みに変える。

### 中核事業
整巡湯（温泉研究所監修の入浴剤）を経営改善の道具として、施術院の経営体力向上を支援する。
商品販売ではなくコンサルティングが事業の本質。

### ターゲット
施術院（鍼灸院・整骨院・整体院等）の経営者
課題: 値上げへの不安・付加価値不足・リピート率改善ニーズ

---

## LPコピーライティング方針

- 問題提起: 「気付いていない問題」を先に提示 → 解決策の順
- 疑問の技術: 見出しは問いかけ調（例:「なぜ、腕を上げるほど値上げが怖くなるのか。」）
- 表現トーン: 「〜すべきです」ではなく「〜ではないでしょうか」「〜かもしれません」
- CTA: 「申し込んでください」ではなく「まずは無料サンプルを試してみてください」

---

## AIへの作業指示

- 変更後は必ず本番影響を確認してからcommit・push
- 「患者様」ではなく「お客様」を使用（統一済み）
- エンジニア初心者でも分かるよう説明する
- 地域課題・仕組み化・長期資産形成を重視した視点で提案する
