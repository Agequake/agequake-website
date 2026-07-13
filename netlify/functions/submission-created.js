/**
 * Netlify Forms → Google Sheets 連携（Netlify Function版）
 * -------------------------------------------------------------
 * これまでは Site configuration > Notifications の「Outgoing webhook」を
 * 使って Apps Script へ通知していたが、Netlify側の仕様で「送信先が4xx/5xx
 * エラーを6回連続で返すとWebhookが自動的に無効化される」ため、原因を問わず
 * 一度失敗が続くと通知が届かなくなるリスクがあった。
 *
 * この関数は Netlify の「フォーム送信イベントで自動起動する関数」機能
 * （ファイル名を submission-created.js にすることで登録される、Netlifyの
 * 昔からある命名規約）を使い、Outgoing webhookを一切使わずに
 * フォーム送信のたびに直接この関数が呼ばれるようにする。
 *
 * 参考: https://docs.netlify.com/build/functions/trigger-on-events/
 * （Form events: 昔からある "submission-created" のファイル名規約は
 *   現行ドキュメントでも "fully supported" と明記されている）
 *
 * 必要な環境変数（Site configuration > Environment variables で設定）:
 *   - APPS_SCRIPT_URL    : Apps ScriptのWeb App URL（.../exec の形式、secretは含めない）
 *   - APPS_SCRIPT_SECRET : Apps Script側の SHARED_SECRET と同じ文字列
 */

exports.handler = async function (event) {
  try {
    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;

    if (!APPS_SCRIPT_URL) {
      console.error('submission-created: APPS_SCRIPT_URL is not set');
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'APPS_SCRIPT_URL not configured' }) };
    }

    const body = JSON.parse(event.body || '{}');
    // Netlifyのsubmission-created関数は { payload: {...} } でラップして送ってくる場合と
    // フラットな場合があるため、両方に対応する（Apps Script側と同じ考え方）
    const payload = body.payload || body;

    const url = new URL(APPS_SCRIPT_URL);
    if (APPS_SCRIPT_SECRET) {
      url.searchParams.set('secret', APPS_SCRIPT_SECRET);
    }

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log('submission-created: Apps Script response', res.status, text);

    // Netlify Functionsの戻り値はフォーム送信者には影響しない（既にNetlify Forms保存は完了済み）。
    // 常に200を返し、成否はログとApps Script側の結果で確認する。
    return { statusCode: 200, body: JSON.stringify({ ok: true, appsScriptStatus: res.status }) };
  } catch (err) {
    console.error('submission-created: error', err);
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
