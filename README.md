# Image to Text

一日一枚の絵画を、四百字の描写にする訓練アプリ。
毎朝お題（パブリックドメインの絵＋書き手への制約）が出て、書いて投稿すると、AI が四つの軸で講評し、そのあとで AI の模範文が開く。

いまは **一人用のパイロット（M1）** だが、データ構造と権限は最初から多人数用に作ってある。

## 構成

| 層 | 使っているもの | 役割 |
|---|---|---|
| フロント | Nuxt 4（Vue 3 + TypeScript） | 画面。`app/` |
| サーバー | Nuxt のサーバー層（Nitro） | API・cron・Claude 呼び出し。`server/` |
| DB・認証 | Supabase（Postgres + Auth） | データと RLS。`supabase/migrations/` |
| AI | Claude API | お題の制約と模範文の生成、講評 |
| 絵 | Art Institute of Chicago API | パブリックドメインの絵画 |
| 定期実行 | Vercel Cron | 毎朝 6:00 JST にお題を生成 |

## 一日の流れ

1. **6:00 JST** — cron が `/api/cron/daily-prompt` を叩く。AIC から未使用の絵画を一枚選び、Claude に絵を見せて「制約」と「模範文」を作らせ、保存する。
2. **書く** — `/` に絵と制約が出る。字数は空白・改行を除いて数える。
3. **投稿** — `/api/submissions` が投稿を保存し、Claude が四軸（何を選んだか・比喩の密度・文のリズム・身体の描き方）で 1〜5 点と講評を返す。
4. **模範文が開く** — 投稿後にだけ読める（RLS で強制）。

## 多人数化に効いている設計

- **すべての利用者データに `user_id`。** `submissions.user_id` は DB 側の `default auth.uid()` で入るので、クライアントから他人になりすませない。
- **見える範囲は RLS で決める。** 投稿は「本人のもの」か「`visibility = 'public'`」だけ読める。パイロットは全件 private。公開機能は、このカラムを切り替える UI を足すだけで済む。
- **模範文は投稿後にだけ読める。** 画面で隠しているのではなく、DB の権限で隠している。
- **ランキングは保存しない。** `prompt_rankings` ビューで、AI スコアといいね数を毎回集計する。指標を変えても過去のデータを作り直す必要がない。
- **採点基準に版番号。** `server/utils/review.ts` の `RUBRIC_VERSION`。講評プロンプトを変えたら上げる。旧版の点数と混ざらない。
- **パイロットでも本物の認証。** メールのマジックリンク。一人用に固定 ID で作ると、多人数化のときに全部作り直しになるため。

## AI まわりの判断

- **構造化出力は `output_config.format`（JSON Schema）で取る。** スキーマに沿った JSON が必ず返るので、文章から JSON を拾うより壊れにくい。点数の 1〜5 の範囲はスキーマで縛れないため、受け取り側で丸めている。
- **講評に模範文を見せない。** 「模範文に似ているか」で採点されるのを避けるため。
- **講評が失敗しても投稿は残す。** 画面から再実行できる（`/api/submissions/:id/review`）。

## セットアップ

```bash
npm install
cp .env.example .env   # 値を埋める
```

1. Supabase でプロジェクトを作り、SQL Editor で `supabase/migrations/0001_init.sql` を実行する。
2. Supabase の Authentication → URL Configuration で、Site URL と Redirect URLs に `http://localhost:3000/confirm`（本番は本番 URL）を加える。
3. `npm run dev` で起動し、`/login` からログインする。
4. 最初のお題を手で作る:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-prompt
   ```

型を Supabase から生成したくなったら `npx supabase gen types typescript --project-id <id>` を使い、`useSupabaseClient<Database>()` に渡す。

## 段階

- [x] **M1** 今日のお題・投稿・AI 講評・模範文
- [ ] **M2** 自分の履歴、軸ごとの点数の推移グラフ
- [ ] **M3** 公開投稿・いいね・お題別ランキング（`visibility` と `likes` と `prompt_rankings` はすでにある）

## 確認が要る点

- AIC の検索条件（`artwork_type_id: 1` = Painting）は、実データで一度確かめること。
- 依存パッケージの一部は `latest` で入れている。`npm install` 後に `package-lock.json` を commit して版を固定する。
