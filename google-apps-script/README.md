# Netlify Forms → Google Sheets 連携セットアップ手順

`agequake.jp/form.html`（無料サンプル申込フォーム）の送信内容を、Netlify Forms保存・Outlook通知に加えて、Googleスプレッドシート「無料サンプル申込一覧」にも自動で1行追加するための手順です。

## 重複記録・記録が止まる問題について（重要）

これまでに2つの不具合が見つかり、いずれも `Code.gs` 側で対策済みです。

**① 重複記録（1回の送信が数行に増える）**

Netlifyの Outgoing webhook が1回の送信に対して複数回リトライし、同じ内容が数行重複して記録されることがありました。対策として `Code.gs` は Netlify から届く送信ごとの一意なID（`payload.id`）をスプレッドシートの「送信ID」列に記録し、同じIDの送信が既に記録済みの場合はスキップする重複排除ロジックを実装しています。

**② ある時点から新規送信が一切記録されなくなる（今回の本質的な原因）**

Netlifyの Outgoing webhook には「送信先が4xx/5xxエラーを6回連続で返すと、そのWebhookを自動的に無効化する」という仕様があります（Site configuration > Notifications > Emails and webhooks の画面に「1 hook has been disabled for failing 6 times in a row」のように表示されます）。

以前の `Code.gs` には次の2つのバグがあり、これがHTTP 500エラーを引き起こして自動無効化を誘発していました。

- `doGet` が未定義だったため、GETリクエスト（疎通確認など）が来ると「関数が見つからない」エラーでHTTP 500を返していた
- `LockService.getScriptLock().waitLock()` が `try` の外にあり、ロック競合時に投げられる例外がキャッチされずHTTP 500を返していた（Apps ScriptのWeb Appは本来常にHTTP 200を返す設計だが、tryの外で例外が発生するとこの原則が崩れる）

対策として、`doGet` ハンドラを追加し、`waitLock()` を例外を投げない `tryLock()` に変更してtry内に移動しました。これにより、どんなリクエストが来ても常にHTTP 200が返るようになり、Netlify側の自動無効化が発生しなくなります。

**Webhookが「Disabled」と表示されている場合の対処**

上記の修正を反映してデプロイし直しても、Netlify側で一度無効化されたWebhookは自動的には有効に戻りません。Site configuration > Notifications > Emails and webhooks の該当のWebhookを「編集通知」から開き、内容を変更せずそのまま「保存」するだけで再度有効になります（Netlifyの公式な再有効化手順です）。

## 全体の流れ

```
ユーザーがフォーム送信
   ↓
Netlify Forms が受信・保存（既存機能、修正不要）
   ↓
Netlify の Outgoing webhook 通知が発火
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

## 手順4: Netlify側でOutgoing webhookを設定する

1. Netlifyのサイトダッシュボードを開く
2. **Site configuration（Site settings）> Forms > Form notifications**（環境によっては単に「Notifications」）を開く
3. **Add notification > Outgoing webhook** を選択
4. 設定:
   - Event to listen for: **New form submission**
   - URL to notify: 手順3で控えたURLの末尾に `?secret=<SHARED_SECRETと同じ文字列>` を付けたもの
     - 例: `https://script.google.com/macros/s/xxxxxxxx/exec?secret=agequake-form-hook-2026`
   - Form: 「すべてのフォーム」のままでよい（Apps Script側のFORM_CONFIGでフォーム名ごとに振り分けるため、Netlify側を都度絞り込む必要はない）
5. 保存する

※ Netlifyのメニュー名称・階層はUIアップデートで変わることがあります。「Forms」「Notifications」「Outgoing webhook」のキーワードで探してください。

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
4. 該当フォームのNetlify側 Outgoing webhook 通知先を、同じApps Script URLに設定する（Form指定を「すべてのフォーム」にしておけば、フォーム追加のたびにNetlify側を設定し直す必要もありません）

`FORM_CONFIG` に未登録のフォームが送信されてきた場合も、受信データのキーをそのまま列にした自動シートが作られるため、記録が失われることはありません（後から `FORM_CONFIG` を整えて綺麗な列構成に直せます）。
