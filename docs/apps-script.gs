/**
 * MamaLima Room 申し込み記録スクリプト
 *
 * サイトのフォームから送られた内容を、スプレッドシートに1行ずつ追加します。
 * _sheet の値でタブを振り分けます。
 *
 * 【設置手順】
 *  1. スプレッドシート「MamaLima Room 申し込み一覧」を開く
 *  2. 上のメニュー「拡張機能」→「Apps Script」
 *  3. 表示されたコードを全部消して、このファイルの中身を貼り付ける
 *  4. 保存（フロッピーのマーク）
 *  5. 右上の「デプロイ」→「新しいデプロイ」
 *     ・種類を選択（歯車）→「ウェブアプリ」
 *     ・次のユーザーとして実行：自分
 *     ・アクセスできるユーザー：全員        ← ここが重要
 *  6.「デプロイ」→ 承認を求められたら許可する
 *  7. 表示された「ウェブアプリのURL」をコピーして送ってください
 */

// タブごとの列。左から順にこの並びで記録されます
var SHEETS = {
  'レッスン申し込み': [
    'ママのお名前',
    'お子さんのお名前',
    'お子さんの生年月日',
    'ご希望のコース',
    '現在のお悩み',
    'お悩みの詳細',
    '写真の掲載可否',
    '知ったきっかけ',
    'email',
    '電話番号',
    'メッセージ'
  ],
  'ぬくもり申し込み': [
    '参加希望日',
    'お名前',
    'email',
    '電話番号',
    'お子さんの月齢',
    '気になっていること'
  ]
};

function doPost(e) {
  try {
    var params = (e && e.parameter) || {};
    var multi = (e && e.parameters) || {};
    var sheetName = params._sheet || 'その他';

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    var cols = SHEETS[sheetName];

    // 定義のないタブに届いた場合は、届いた項目をそのまま列にする
    if (!cols) {
      cols = Object.keys(params).filter(function (k) {
        return k.charAt(0) !== '_';
      });
    }

    // タブが無ければ作って、見出し行を入れる
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['受信日時'].concat(cols));
      sheet.getRange(1, 1, 1, cols.length + 1).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var row = cols.map(function (col) {
      var values = multi[col];
      // チェックボックスなど複数選べる項目は「／」でつなぐ
      if (values && values.length > 1) return values.join(' ／ ');
      return params[col] || '';
    });

    sheet.appendRow([new Date()].concat(row));

    return ContentService.createTextOutput('ok');
  } catch (err) {
    // 失敗しても、サイト側のフォーム送信は成功したままにする
    console.error(err);
    return ContentService.createTextOutput('error');
  }
}

// デプロイの動作確認用（ブラウザでURLを開くと表示されます）
function doGet() {
  return ContentService.createTextOutput('MamaLima Room 申し込み記録スクリプト：動作中');
}
