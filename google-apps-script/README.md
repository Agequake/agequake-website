# Netlify Forms → Google Sheets 連携セットアップ手順

`agequake.jp/form.html`（無料サンプル申込フォーム）の送信内容を、Netlify Forms保存・Outlook通知に加えて、Googleスプレッドシート「無料サンプル申込一覧」にも自動で1行追加するための手順です。

## Outgoing webhookをやめてNetlify Function方式に変更した理由（重要）

以前は Site configuration > Notifications の「Outgoing webhook」を使ってApps Scriptへ通知していましたが、次の問題があったため **Netlify Function（`netlify/functions/submission-created.js`）経由でApps ScriptへPOSTする方式に変更しました**。現在Netlify側にOutgoing webhookの設定はありません。

**① 重複記録（1回の送信が数行に増える）**

Outgoing webhookが1回の送信に対して複数回リトライし、同じ内容が数行重複して記録されることがありました。対策として `Code.gs` は送信ごとの一意なID（`payload.id`）をスプレッドシートの「送信ID」列に記録し、同じIDの送信が既に記録済みの場合はスキップする重複排除ロジックを実装しています（この対策は現在も有効です）。

**② ある時点から新規送信が一切記録されなくなる（Outgoing webhook方式の本質的な弱点）**

NetlifyのOutgoing webhookには「送信先が4xx/5xxエラーを6回連続で返すと、そのWebhookを自動的に無効化する」という仕様があります。以前の `Code.gs` のバグ（`doGet`未定義、`waitLock()`がtryの外にある）でHTTP 500が発生し、これが自動無効化を誘発して記録が突然止まる事故が起きました。バグ自体は修正済みですが、「送信先が何らかの理由で一時的にエラーを返すと、ユーザーの知らないところで通知そのものが止まる」というOutgoing webhook方式のリスク自体は仕組み上なくなりません。

**→ 対策: Netlify Functionへの移行**

Netlifyの「フォーム送信イベントで自動起動する関数」機能（`netlify/functions/submission-created.js` というファイル名にすることで登録される、Netlifyの命名規約）を使うことで、Outgoing webhookの「6回失敗で自動無効化」という仕組みそのものを回避しています。この関数はフォーム送信のたびに直接Netlify側から呼び出され、内部でApps ScriptへPOSTします。Apps Script側が仮にエラーを返しても、Netlify Forms自体の送信記録やフォーム送信者への応答には一切影響しません。

## 全体の流れ

```
ユーザーがフォーム送信
   ↓
Netlify Forms が受信・保存（既存機能、修正不要）
   ↓
Netlify Function（netlify/functions/submission-created.js）が発火
   ↓
Google Apps Script の Web App (doPost) が受信
   ↓
対象スプレッドシートの該当シートに1行追加
   （受付日時・対応状況「未対応」を自動セット）
```

HTML側の追加修正は不要です。現状の `form.html` は既にNetlify Formsへ正常送信できているので、この仕組みは完全にNetlifyのサーバー側から発火します。

---

## 手順1: スプレッドシートを用意する

1. Google ドライブで新しいスプレッドシートを作成し、名前を「無料サンプル申込一覧」などわかりやすい名前にする（このファイル自体は複数フォームの受け皿として使い回せます。フォームごとにシート＝タブが自動で分かれます）
2. シート（タブ）は自動生成されるので、この時点で手動で列を作る必要はありません

## 手順2: Apps Script を作成する

1. 手順1のスプレッドシートを開いた状態で、メニューから **拡張機能 > Apps Script** を開く
2. デフォルトで開かれる `コード.gs` の中身を全て削除し、このフォルダの `Code.gs` の内容を貼り付ける
3. コード内の `SHARED_SECRET` の値を、他人に推測されない文字列に変更する（例: パスワード的な文字列）
4. 保存する（ファイル名は `Code.gs` のままでよい）

## 手順3: Web App としてデプロイする

1. 右上の **デプロイ > 新しいデプロイ** をクリック
2. 歯車アイコンから種類を **ウェブアプリ** に設定
3. 設定:
   - 説明: 任意（例: Netlify Forms連携）
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**（Netlifyからの匿名POSTを受け付けるため必須）
4. **デプロイ** をクリックすると、Googleアカウントへのアクセス許可を求められるので許可する
5. 発行された **ウェブアプリのURL**（`https://script.google.com/macros/s/…/exec` の形式）を控える

### 動作確認（任意だが推奨）

Apps Script エディタで関数選択を `testDoPost` にして実行し、対象スプレッドシートに「無料サンプル申込一覧」シートとテスト行が1件追加されることを確認してください。

## 手順4: Netlify Functionを設定する

Outgoing webhookは使いません。代わりにリポジトリ内の `netlify/functions/submission-created.js` がフォーム送信のたびに自動起動し、Apps ScriptへPOSTします。

1. リポジトリのルートに `netlify.toml`（`[functions]` セクションで `directory = "netlify/functions"` を指定）と `netlify/functions/submission-created.js` が含まれていることを確認する（このリポジトリには既に含まれています）
2. Netlifyのサイトダッシュボードで **Site configuration > Environment variables** を開き、次の2つを設定する:
   - `APPS_SCRIPT_URL`: 手順3で控えたWeb AppのURL（`.../exec` の形式、`?secret=...` は付けない）
   - `APPS_SCRIPT_SECRET`: `Code.gs` の `SHARED_SECRET` と同じ文字列
   - どちらも「Contains secret values」をオンにし、Production / Deploy Previews / Branch deploys など必要なデプロイ環境にチェックを入れる
3. サイトをデプロイする（GitHub連携なら通常のpushで自動デプロイされる）

これで、Site configuration > Notifications の「Form submission notifications」にはメール通知のみが残り、Outgoing webhookの項目は不要になります（残っている場合は削除して構いません）。

※ Netlifyのメニュー名称・階層はUIアップデートで変わることがあります。「Environment variables」「Functions」のキーワードで探してください。

## 手順5: 本番テスト

1. `agequake.jp/form.html` から実際にテスト送信する
2. Netlify Forms に送信が記録されること（既存動作）
3. Outlook通知が届くこと（既存動作）
4. 数秒以内にスプレッドシートの「無料サンプル申込一覧」シートに1行追加されること
   - 受付日時が自動入力されていること
   - 対応状況が「未対応」になっていること

---

## 今後、別のフォームを追加する場合

1. `form.html` と同様に、新しいフォームにも `<form name="◯◯-form" data-netlify="true" netlify>` と `<input type="hidden" name="form-name" value="◯◯-form">` を設定する（既存フォームと同じ作法）
2. `Code.gs` の `FORM_CONFIG` オブジェクトに、そのフォーム名をキーにしたエントリを追加する（シート名・列構成を指定）
3. Apps Script を編集したら **デプロイ > デプロイを管理 > 編集(鉛筆アイコン) > バージョン「新バージョン」を選択 > デプロイ** で再デプロイする（URLは変わらないのでNetlify側の設定変更は不要）
4. Netlify Function（`netlify/functions/submission-created.js`）は全フォームの送信に対して発火するため、フォームを追加してもNetlify側の設定をやり直す必要はありません

`FORM_CONFIG` に未登録のフォームが送信されてきた場合も、受信データのキーをそのまま列にした自動シートが作られるため、記録が失われることはありません（後から `FORM_CONFIG` を整えて綺麗な列構成に直せます）。
