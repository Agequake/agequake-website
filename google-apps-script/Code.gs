/**
 * Netlify Forms → Google Sheets 連携用 Web App
 * -------------------------------------------------------------
 * Netlify Forms の「Outgoing webhook」通知から呼び出される想定。
 * 複数フォームに対応できる汎用構成にしてあるので、
 * 新しいフォームを追加するときは FORM_CONFIG にエントリを追加するだけでOK。
 *
 * 【使い方】
 * 1. Googleスプレッドシートを開き、拡張機能 > Apps Script でこのファイルを貼り付ける
 *    （スプレッドシートに紐づく「コンテナバインド」スクリプトとして作成すること。
 *      SpreadsheetApp.getActiveSpreadsheet() でそのスプレッドシート自身を参照するため）
 * 2. 下の SHARED_SECRET を推測されにくい文字列に変更する
 * 3. デプロイ > 新しいデプロイ > 種類「ウェブアプリ」
 *      - 実行するユーザー: 自分
 *      - アクセスできるユーザー: 全員
 *    でデプロイし、発行された /exec で終わるURLを控える
 * 4. Netlify側の Outgoing webhook 通知の宛先URLに
 *      <そのURL>?secret=<SHARED_SECRETと同じ文字列>
 *    を設定する
 */

// Netlifyからの不正POST対策の簡易シークレット。必ず変更すること。
var SHARED_SECRET = 'agequake-form-hook-2026';

// フォームごとの設定。キーは Netlify 側の <form name="..."> の値と一致させる。
// 今後フォームを増やす場合はこのオブジェクトにエントリを追加するだけでよい。
var FORM_CONFIG = {
  'sample-form': {
    sheetName: '無料サンプル申込一覧',
    columns: [
      { header: '受付日時',         type: 'timestamp' },
      { header: '院名',             field: 'clinicName' },
      { header: 'ご担当者名',       field: 'name' },
      { header: '郵便番号',         field: 'zip' },
      { header: '都道府県',         field: 'prefecture' },
      { header: '市区町村',         field: 'city' },
      { header: '町名・番地',       field: 'town' },
      { header: '建物名・部屋番号', field: 'building' },
      { header: '電話番号',         field: 'tel' },
      { header: 'メールアドレス',   field: 'email' },
      { header: 'ご要望・ご質問',   field: 'message' },
      { header: '対応状況',         type: 'status', default: '未対応' }
    ]
  }

  // 例）今後別フォームを追加する場合はこのようにコピーして追記する:
  // 'contact-form': {
  //   sheetName: 'お問い合わせ一覧',
  //   columns: [
  //     { header: '受付日時',       type: 'timestamp' },
  //     { header: 'お名前',         field: 'name' },
  //     { header: 'メールアドレス', field: 'email' },
  //     { header: 'お問い合わせ内容', field: 'message' },
  //     { header: '対応状況',       type: 'status', default: '未対応' }
  //   ]
  // }
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (SHARED_SECRET) {
      var providedSecret = e && e.parameter ? e.parameter.secret : null;
      if (providedSecret !== SHARED_SECRET) {
        return jsonResponse({ ok: false, error: 'unauthorized' });
      }
    }

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'no post data' });
    }

    var body = JSON.parse(e.postData.contents);
    // Netlifyのoutgoing webhookは提出内容を { payload: {...} } でラップして送る場合と
    // フラットに送る場合があるため、両方に対応する
    var payload = body.payload || body;
    var formName = payload.form_name || payload.formName || 'unknown-form';
    var data = payload.data || payload.human_fields || {};

    var config = FORM_CONFIG[formName];
    var columns;
    if (config) {
      columns = config.columns;
    } else {
      // FORM_CONFIG未設定のフォームでも記録は取りこぼさないよう、
      // 受信データのキーからその場で列構成を組み立てて自動記録する
      columns = [{ header: '受付日時', type: 'timestamp' }]
        .concat(Object.keys(data).map(function (k) {
          return { header: k, field: k };
        }))
        .concat([{ header: '対応状況', type: 'status', default: '未対応' }]);
      config = { sheetName: formName, columns: columns };
    }

    var sheet = getOrCreateSheet(config.sheetName, columns);

    var row = columns.map(function (col) {
      if (col.type === 'timestamp') return new Date();
      if (col.type === 'status') return col.default || '';
      var v = data[col.field];
      return v !== undefined && v !== null ? v : '';
    });

    sheet.appendRow(row);

    return jsonResponse({ ok: true, sheet: config.sheetName });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet(sheetName, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(columns.map(function (c) { return c.header; }));
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  // Apps Script の Web App は常に HTTP 200 を返す仕様のため、
  // 成否は返却JSONの ok フィールドで判定する
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Apps Script エディタから直接実行して動作確認するためのテスト関数。
 * 実行後、対象スプレッドシートに「無料サンプル申込一覧」シートができ、
 * テスト行が1件追加されていればOK。
 */
function testDoPost() {
  var fakeEvent = {
    parameter: { secret: SHARED_SECRET },
    postData: {
      contents: JSON.stringify({
        payload: {
          form_name: 'sample-form',
          data: {
            clinicName: 'テスト施術院',
            name: '山田 太郎',
            zip: '123-4567',
            prefecture: '大阪府',
            city: '茨木市',
            town: '総持寺10',
            building: '',
            tel: '080-0000-0000',
            email: 'test@example.com',
            message: 'これはテスト送信です'
          }
        }
      })
    }
  };
  var result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
