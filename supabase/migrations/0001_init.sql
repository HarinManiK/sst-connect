-- SST Connect: initial schema
-- Run in Supabase SQL editor, or via `supabase db push` once the project is linked.

create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
-- One row per auth.users account. batch/year_code/student_id are
-- parsed automatically from a @sst.scaler.com email (see parse_college_email
-- below); for students without a college mail yet, these stay null until
-- either (a) they self-report them at onboarding, or (b) they link a
-- college email later and the trigger fills them in.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  personal_email text,
  college_email text unique,
  is_verified boolean not null default false,
  batch int,                 -- e.g. 4  (derived from year_code, or self-reported)
  year_code text,            -- e.g. '25' (only ever set by parsing a college email)
  student_id text,           -- e.g. '10680' -- unique only within (year_code, student_id), not globally
  branch text,
  hostel_block text,
  intent text check (intent in ('friends', 'dating', 'either')) default 'either',
  bio text,
  avatar_url text,
  discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- (year_code, student_id) must be unique together -- NOT student_id alone,
-- since two different students in different batches can share the same id
-- (e.g. 24bcs10121 and 25bcs10121 are different people).
create unique index if not exists profiles_year_student_id_key
  on profiles (year_code, student_id)
  where year_code is not null and student_id is not null;

-- ============================================================
-- INTERESTS (taxonomy) + join table
-- ============================================================
create table if not exists interests (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists profile_interests (
  profile_id uuid not null references profiles (id) on delete cascade,
  interest_id uuid not null references interests (id) on delete cascade,
  primary key (profile_id, interest_id)
);

-- ============================================================
-- POSTS / LIKES / COMMENTS
-- ============================================================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  content text,
  image_url text,
  category text check (category in ('hot', 'tech', 'culture', 'general')) default 'general',
  category_confidence numeric,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists posts_category_created_idx on posts (category, created_at desc);
create index if not exists posts_author_idx on posts (author_id);

create table if not exists post_likes (
  post_id uuid not null references posts (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FRIENDSHIPS (request/accept model)
-- ============================================================
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined', 'blocked')) default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

-- one relationship row per unordered pair
create unique index if not exists friendships_pair_key
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- ============================================================
-- MESSAGES (1:1 chat, only between accepted friends -- enforced in RLS)
-- ============================================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles (id) on delete cascade,
  receiver_id uuid not null references profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_idx
  on messages (least(sender_id, receiver_id), greatest(sender_id, receiver_id), created_at);

-- ============================================================
-- REPORTS + ADMIN ACTION LOG
-- ============================================================
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile', 'message', 'comment')),
  target_id uuid not null,
  reason text not null,
  status text not null check (status in ('open', 'reviewed', 'actioned', 'dismissed')) default 'open',
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  action text not null,          -- e.g. 'delete_account', 'verify_account', 'remove_post', 'dismiss_report'
  target_type text not null,
  target_id uuid,
  note text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- COLLEGE EMAIL PARSING
-- Format: <first_name>.<year>bcs<student_id>@sst.scaler.com
-- year 23 -> batch 1, 24 -> batch 2, 25 -> batch 3, 26 -> batch 4, ...
-- ============================================================
create or replace function parse_college_email()
returns trigger as $$
declare
  m text[];
begin
  if new.college_email is not null then
    m := regexp_match(lower(new.college_email), '^([a-z]+)\.(\d{2})bcs(\d+)@sst\.scaler\.com$');
    if m is not null then
      new.year_code := m[2];
      new.batch := (m[2]::int - 22);
      new.student_id := m[3];
      new.is_verified := true;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_parse_college_email on profiles;
create trigger trg_parse_college_email
  before insert or update of college_email on profiles
  for each row execute function parse_college_email();

-- ============================================================
-- ROW LEVEL SECURITY
-- The admin panel uses the Supabase service role key (server-side only),
-- which bypasses RLS entirely -- so no admin-specific policies are needed
-- here. Everything below is for the student-facing app using the anon/
-- authenticated key.
-- ============================================================
alter table profiles enable row level security;
alter table interests enable row level security;
alter table profile_interests enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;
alter table friendships enable row level security;
alter table messages enable row level security;
alter table reports enable row level security;

-- profiles: any authenticated, non-deleted user can be viewed; only the
-- owner can update their own row. No client-side inserts/deletes -- those
-- happen via the auth trigger / admin panel.
create policy profiles_select on profiles
  for select to authenticated
  using (deleted_at is null);

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- interests: readable by everyone authenticated; not client-writable
create policy interests_select on interests
  for select to authenticated
  using (true);

create policy profile_interests_select on profile_interests
  for select to authenticated
  using (true);

create policy profile_interests_own on profile_interests
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy profile_interests_delete_own on profile_interests
  for delete to authenticated
  using (profile_id = auth.uid());

-- posts: readable by all authenticated users; only author can insert/delete
create policy posts_select on posts
  for select to authenticated
  using (deleted_at is null);

create policy posts_insert_own on posts
  for insert to authenticated
  with check (author_id = auth.uid());

create policy posts_delete_own on posts
  for update to authenticated
  using (author_id = auth.uid());

create policy post_likes_select on post_likes
  for select to authenticated using (true);

create policy post_likes_own on post_likes
  for insert to authenticated with check (profile_id = auth.uid());

create policy post_likes_delete_own on post_likes
  for delete to authenticated using (profile_id = auth.uid());

create policy post_comments_select on post_comments
  for select to authenticated using (true);

create policy post_comments_insert_own on post_comments
  for insert to authenticated with check (author_id = auth.uid());

-- friendships: only the two parties involved can see/act on a row
create policy friendships_select on friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy friendships_insert on friendships
  for insert to authenticated
  with check (requester_id = auth.uid());

-- only the addressee can accept/decline; canceling/unfriending is a delete
create policy friendships_update on friendships
  for update to authenticated
  using (addressee_id = auth.uid());

-- either party can remove the relationship (cancel a pending request, or
-- unfriend an accepted one)
create policy friendships_delete on friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- messages: only sender/receiver can see a message; sending requires an
-- accepted friendship in either direction
create policy messages_select on messages
  for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy messages_insert on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = messages.sender_id and f.addressee_id = messages.receiver_id)
          or
          (f.requester_id = messages.receiver_id and f.addressee_id = messages.sender_id)
        )
    )
  );

-- reports: any authenticated user can file one; only the reporter can see
-- their own submissions (admin panel reads all via service role)
create policy reports_insert on reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy reports_select_own on reports
  for select to authenticated
  using (reporter_id = auth.uid());
