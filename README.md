# MamaLima Room ウェブサイト

Wixサイト（https://risaairlysblue.wixsite.com/mamalimaroom）を元に作り直した、
HTML/CSS/JavaScriptだけで動くシンプルなサイトです。ビルド不要、フレームワーク不要。

## フォルダ構成

```
index.html          ホーム
lessons/
  index.html         レッスンメニュー一覧
  support3m.html      3ヶ月継続サポート 詳細
  personal.html        マンツーマン単発レッスン 詳細
  group.html            グループレッスン 詳細
reserve.html         ご予約フォーム
voices.html          ママの声
calendar.html        カレンダー（イベント一覧）
concept.html         教室の想い
profile.html         プロフィール
selfcare.html        ママの学び・セルフケア
privacy.html / tokushoho.html / terms.html   法律系ページ（要・内容追加）

components/          共通パーツ（ヘッダー・フッター・お問い合わせフォーム）
css/style.css        デザイン（色・フォントなどはここでまとめて管理）
js/main.js           ナビ開閉・カレンダー描画・フォーム送信の処理
data/events.json     イベント・ワークショップのデータ
images/              写真を入れるフォルダ（今はすべて仮の枠）
```

## イベントの追加・変更のしかた（月1〜2回の更新用）

`data/events.json` を編集するだけです。1件はこの形式です。

```json
{
  "date": "2026-09-20",
  "title": "季節のアロマワークショップ",
  "type": "ワークショップ",
  "time": "13:00〜14:30",
  "place": "対面（奈良）",
  "capacity": 8,
  "remaining": 5,
  "lineUrl": "https://line.me/R/ti/p/@your-line-id"
}
```

配列に追加・削除するだけで、カレンダーページ（`/calendar.html`）と
セルフケアページの「最新のイベントとワークショップ」欄に自動反映されます。

一番簡単なのは、Claude Codeに「◯月◯日に◯◯のイベント追加して、定員◯名」と
話しかけて編集してもらう運用です。慣れてきたら直接JSONを編集してもOKです。

## ローカルで確認する方法

このサイトは `fetch` でヘッダー/フッターを読み込む作りなので、
`index.html` を直接ダブルクリックして開くだけでは正しく表示されません。
簡易サーバーを立てて確認してください。

```bash
cd /path/to/journal
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

## お問い合わせフォームについて（要設定）

このサイトは静的サイト（サーバー処理なし）なので、フォーム送信をメールに
届けるには外部サービスが必要です。無料の **Formspree**（https://formspree.io）
を使う想定で組んであります。

設定手順:
1. https://formspree.io で無料アカウントを作成し、`mamalima.room@gmail.com` で
   フォームを1つ作成する
2. 発行された フォームURL（`https://formspree.io/f/xxxxxxx` のような形）をコピー
3. `components/contact-form.html` 内の
   `action="https://formspree.io/f/YOUR_FORM_ID"` の `YOUR_FORM_ID` 部分を
   実際のIDに置き換える

設定するまでは、フォーム送信時に「フォーム送信先が未設定です」という
メッセージが表示されるようになっています（誤って送信されることはありません）。

## 直したほうがいい・確認してほしい点

- **フッターのInstagram / LINEアイコン**：リンク先が仮の `#` のままです。
  実際のURLに差し替えてください（`components/footer.html`）。
- **プライバシーポリシー／特定商取引法に基づく表記／レッスン規約**：
  旧サイトの本文をまだ受け取れていないので「準備中」のままです。
  テキストをもらえれば反映します。
- **写真**：すべて仮の枠（グラデーションのプレースホルダー）です。
  `images/` フォルダに実際の写真を入れて、各ページの `.card-photo` 部分を
  `<img>` タグに差し替えれば反映できます。
- 元サイトの「ママの学び・セルフケア」ページに「東京都内エリアの発達と
  タッチケアのクラスを開催しております」という一文がありましたが、
  プロフィールでは「奈良県在住」となっていたため、このサイトでは
  「奈良県内（オンラインは全国対応）」に統一しました。もし東京での活動も
  実際にある場合は教えてください。

## 公開方法（デプロイ）

まだ公開先が未定とのことなので、無料で簡単な **GitHub Pages** を想定しています。

1. このリポジトリの GitHub 上の設定画面で「Pages」を開く
2. ブランチを指定して公開を有効にする
3. `https://（ユーザー名）.github.io/（リポジトリ名）/` で公開される

※ サイト内のリンクはすべて `/index.html` のようにドメイン直下からのパスに
なっているため、リポジトリ名がパスに入る形（`/journal/` など）で公開すると
リンクが正しく機能しません。その場合は以下のどちらかが必要です。
- 独自ドメインを設定する
- Netlify / Vercel など、ドメイン直下に公開できるサービスを使う

迷ったら、そのタイミングで相談してください。
