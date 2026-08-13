# AliceMay ホームページ

大阪のミシン刺繍ハンドメイド **AliceMay** の紹介サイトです。

- 公開URL: https://alicemay.soleon.jp/
- Creema: https://www.creema.jp/c/AliceMay/item/onsale
- Instagram: https://www.instagram.com/alicemay_handmade

販売と決済はCreemaで行い、このサイトは「作品と世界観を伝えてCreemaとInstagramへ送る」役割に徹しています。

---

## 構成

ビルド作業は不要です。HTML・CSS・JavaScript をそのまま置いているだけなので、
ファイルを直して `main` に push すれば数分後に公開サイトへ反映されます。

```
index.html         ページ本体（文章・作品リストはここ）
styles.css         見た目
script.js          メニュー開閉・スクロール表示・動画切り替え
assets/images/     写真（webp）
video/             トップの動画（mp4）
scripts/optimize.mjs  素材を Web 用に変換するスクリプト
```

---

## 手元で確認する

```bash
npm run serve
```

`http://localhost:8000` が開けます。止めるときは `Ctrl+C`。

---

## よくある更新のしかた

### 文章を直す

`index.html` を開いて、該当箇所の日本語を書き換えるだけです。
`<` `>` で囲まれた部分（タグ）は消さないように気をつけてください。

### 作品を差し替える・追加する

作品カードは `index.html` の `<!-- ==================== WORKS ====== -->` 以下にあります。
1つの作品が次のかたまりに対応しています。

```html
<li class="work-card">
  <a href="https://www.creema.jp/item/20121960/detail" target="_blank" rel="noopener">
    <span class="work-thumb"><img src="./assets/images/works/set-car-5.webp" ...></span>
    <span class="work-body">
      <span class="work-name">はたらく車の5点セット</span>
      <span class="work-meta"><span class="work-tag">サイズ変更可</span><span class="work-price">¥11,800</span></span>
    </span>
  </a>
</li>
```

- `href` … Creemaの作品ページURL
- `src` … 写真のファイル名
- `work-name` … サイトに出す短い作品名（Creemaの長いタイトルそのままでなくてよい）
- `work-tag` … 「サイズ変更可」「リバティ」などの短い一言
- `work-price` … 価格

**売り切れた作品は、その `<li>...</li>` のかたまりごと消してください。**
リンク先が無くなったままにしておくと、見に来た人が404ページに飛んでしまいます。

### 写真を差し替える

1. 新しい写真を `.raw/creema/` に置きます（ファイル名は `set-car-5.jpg` のように、差し替えたいwebpと同じ名前）
2. `npm run optimize` を実行します
3. `assets/images/works/` のwebpが新しくなります

`.raw/` はGitHubには上がりません（元データ置き場です）。

### トップの動画を差し替える

1. 新しい動画を `.raw/vid-01.mp4` `.raw/vid-02.mp4` として置きます
2. `npm run optimize` を実行します
3. `video/hero-01.mp4` `hero-02.mp4` と、静止画の `assets/images/hero-poster.webp` が作り直されます

動画は1本だけでも動きます。その場合は `index.html` の `data-hero-video` の
`<video>` タグを1つ消してください。

### Instagramの投稿を並べたい

いまのInstagramセクションはリンクボタンだけです。投稿のサムネイルを6枚並べたい場合は、
各投稿の画像を `assets/images/instagram/` に置き、投稿URLへのリンクを貼ったグリッドを追加します。

> Instagramの公式APIは個人サイトでは事実上使えないため（Basic Display APIは廃止、
> Graph APIは審査とサーバーが必要）、自動取得ではなく手動で画像を差し替える方式にしています。

---

## 素材の変換について

このマシンには `ffmpeg` と `cwebp` が入っていないため、
sudo不要の npm パッケージ（`sharp` と `ffmpeg-static`）で代替しています。

```bash
npm run optimize
```

- `.raw/gen-*.png` → セクション用の webp と OGP画像
- `.raw/creema/*.jpg` → `assets/images/works/*.webp`（800×800で切り抜き）
- `.raw/vid-*.mp4` → `video/hero-0*.mp4`（960px幅・無音・各150KB前後）とポスター画像

---

## テスト

```bash
npm test
```

375 / 768 / 1440px でスクリーンショットを撮り、
ナビの開閉・FAQの開閉・トップ動画の再生・**外部リンクの疎通**を確認します。
リンク切れチェックが入っているので、作品を入れ替えたあとは必ず実行してください。

初回のみブラウザと依存ライブラリの導入が必要です。

```bash
npx playwright install chromium
sudo npx playwright install-deps chromium   # パスワードを聞かれます
```

---

## 公開の設定（初回のみ）

1. GitHubリポジトリ `fs-morita/alicemay` を **Public** にする（GitHub Pages無料枠の条件）
2. Settings > Pages で `Source` を **Deploy from a branch**、`Branch` を **main / (root)** にして保存
3. soleon.jp のDNSに、以下のCNAMEレコードを追加

   | ホスト名 | 種別 | 値 |
   |---|---|---|
   | `alicemay` | CNAME | `fs-morita.github.io` |

4. 証明書が発行されたら Settings > Pages の **Enforce HTTPS** を有効にする（最大で数十分かかります）

`CNAME` ファイルはリポジトリに入っているので、Pagesの「Custom domain」欄は自動で埋まります。

---

## Googleアナリティクス

未設定です。使う場合は GA4 で新しいプロパティを作り、`index.html` の `<head>` にある
コメントアウトされたスニペットの `G-XXXXXXXXXX` を測定IDに置き換えて、コメントを外してください。
他サイトの測定IDは使い回せません。

---

## 特定商取引法の表記について

販売・決済はCreema上で完結するため、このサイトには表記は不要です。
将来サイト上で直接ご注文を受ける場合は、氏名・住所・連絡先などの記載義務が生じます。
