-- Image to Text: 初期スキーマ
-- 方針: すべての利用者データに user_id を持たせ、RLS で「本人のもの」か「公開されたもの」だけ読める形にする。
-- パイロット中は visibility がすべて 'private' なので、実質的に一人用として動く。

create extension if not exists "pgcrypto";

-- ───────── profiles ─────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── artworks（お題の絵）─────────
create table public.artworks (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,               -- 'aic' | 'met' など
  source_id    text not null,
  title        text not null,
  artist       text,
  date_display text,
  image_url    text not null,
  source_url   text,
  license      text not null default 'public-domain',
  created_at   timestamptz not null default now(),
  unique (source, source_id)
);

-- ───────── prompts（日ごとのお題）─────────
create table public.prompts (
  id              uuid primary key default gen_random_uuid(),
  date            date not null unique,     -- JST の日付
  artwork_id      uuid not null references public.artworks (id),
  constraint_text text not null,            -- 例: 「人物の感情を直接書かない」
  target_length   int  not null default 400,
  created_at      timestamptz not null default now()
);

-- ───────── reference_texts（AI の模範文）─────────
create table public.reference_texts (
  id         uuid primary key default gen_random_uuid(),
  prompt_id  uuid not null references public.prompts (id) on delete cascade,
  body       text not null,
  model      text not null,
  created_at timestamptz not null default now()
);

-- ───────── submissions（投稿）─────────
create table public.submissions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  prompt_id  uuid not null references public.prompts (id) on delete cascade,
  body       text not null,
  char_count int  not null,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  unique (user_id, prompt_id)               -- 一人一お題一投稿（ランキングの前提）
);

-- ───────── reviews（AI 講評）─────────
create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  submission_id     uuid not null references public.submissions (id) on delete cascade,
  rubric_version    text not null,
  score_selection   int  not null check (score_selection between 1 and 5),
  score_metaphor    int  not null check (score_metaphor  between 1 and 5),
  score_rhythm      int  not null check (score_rhythm    between 1 and 5),
  score_body        int  not null check (score_body      between 1 and 5),
  constraint_kept   boolean not null,
  comments          jsonb not null,         -- 軸ごとの講評文
  overall           text not null,
  model             text not null,
  created_at        timestamptz not null default now(),
  unique (submission_id, rubric_version)
);

-- ───────── likes（M3 用。パイロットでは未使用）─────────
create table public.likes (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, submission_id)
);

-- ═════════ RLS ═════════
alter table public.profiles        enable row level security;
alter table public.artworks        enable row level security;
alter table public.prompts         enable row level security;
alter table public.reference_texts enable row level security;
alter table public.submissions     enable row level security;
alter table public.reviews         enable row level security;
alter table public.likes           enable row level security;

-- 絵とお題はログイン済みなら誰でも読める。書き込みは service role（cron）だけ。
create policy "artworks readable" on public.artworks for select to authenticated using (true);
create policy "prompts readable"  on public.prompts  for select to authenticated using (true);

create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid());

-- 模範文は「そのお題に自分が投稿済み」のときだけ読める（先に見て引っ張られないように）
create policy "reference after submitting" on public.reference_texts
  for select to authenticated
  using (exists (
    select 1 from public.submissions s
    where s.prompt_id = reference_texts.prompt_id and s.user_id = auth.uid()
  ));

-- 投稿: 自分のもの、または公開されたもの
create policy "read own or public submissions" on public.submissions
  for select to authenticated
  using (user_id = auth.uid() or visibility = 'public');
create policy "insert own submission" on public.submissions
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own submission" on public.submissions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 講評: 読めるのは、読める投稿に付いたものだけ。書き込みは service role（サーバー）だけ。
create policy "read reviews of visible submissions" on public.reviews
  for select to authenticated
  using (exists (
    select 1 from public.submissions s
    where s.id = reviews.submission_id and (s.user_id = auth.uid() or s.visibility = 'public')
  ));

-- いいね: 公開投稿にだけ付けられる
create policy "read likes"   on public.likes for select to authenticated using (true);
create policy "like public"  on public.likes for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.submissions s where s.id = likes.submission_id and s.visibility = 'public'
  ));
create policy "unlike own"   on public.likes for delete to authenticated using (user_id = auth.uid());

-- ═════════ ランキング（保存せずビューで出す）═════════
-- security_invoker により、閲覧者の RLS がそのまま効く。
create view public.prompt_rankings with (security_invoker = true) as
select
  s.prompt_id,
  s.id as submission_id,
  s.user_id,
  r.rubric_version,
  (r.score_selection + r.score_metaphor + r.score_rhythm + r.score_body) as ai_score,
  (select count(*) from public.likes l where l.submission_id = s.id) as like_count
from public.submissions s
left join public.reviews r on r.submission_id = s.id;
