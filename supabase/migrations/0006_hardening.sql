-- Hardening + Google OAuth fixes. Run this after 0001-0005 (idempotent).
--
-- Fixes, in order:
--   1. Profile sync now reads Google OAuth metadata (full_name / picture),
--      not just the old email+password signup's display_name field.
--   2. CRITICAL: students could UPDATE privileged columns on their own
--      profiles row (college_email -> trigger sets is_verified/batch) via
--      the public REST API. RLS restricts WHICH ROW, not WHICH COLUMNS --
--      column-level grants now lock writes to the fields the app edits.
--   3. Same treatment for posts (author_id was reassignable by the author)
--      and friendships (participant ids were editable by the addressee).
--   4. batch is re-derived from year_code on every update for verified
--      profiles, so it can't be spoofed after verification.
--   5. Explicit PostgREST grants (projects created after May 2026 may not
--      grant table access to API roles by default).
--   6. Storage: owners can delete their own uploads.

-- ============================================================
-- 1. Google OAuth metadata in profile sync
-- ============================================================
create or replace function sync_profile_from_auth_user()
returns trigger as $$
declare
  is_college boolean;
begin
  is_college := new.email ~* '^[a-z]+\.\d{2}bcs\d+@sst\.scaler\.com$';

  if tg_op = 'INSERT' then
    insert into profiles (id, display_name, avatar_url, personal_email, college_email)
    values (
      new.id,
      coalesce(
        new.raw_user_meta_data ->> 'display_name',
        new.raw_user_meta_data ->> 'full_name',   -- Google OAuth
        new.raw_user_meta_data ->> 'name',        -- Google OAuth fallback
        split_part(new.email, '@', 1)
      ),
      coalesce(
        new.raw_user_meta_data ->> 'avatar_url',
        new.raw_user_meta_data ->> 'picture'       -- Google OAuth
      ),
      case when is_college then null else new.email end,
      case when is_college then new.email else null end
    )
    on conflict (id) do nothing;
  elsif tg_op = 'UPDATE' and new.email is distinct from old.email then
    update profiles
    set
      college_email = case when is_college then new.email else college_email end,
      personal_email = case when is_college then personal_email else new.email end
    where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- (triggers from 0002 already point at this function; no need to recreate)

-- ============================================================
-- 2 + 5. Explicit grants, with column-level write restrictions
-- ============================================================
grant usage on schema public to authenticated;

-- anon gets nothing: every read in the app happens behind a login.
revoke all on profiles, interests, profile_interests, posts, post_likes,
  post_comments, friendships, messages, reports, admin_actions from anon;

-- admin_actions is service-role only.
revoke all on admin_actions from authenticated;

grant select on profiles, interests, profile_interests, posts, post_likes,
  post_comments, friendships, messages, reports to authenticated;

grant insert on profile_interests, posts, post_likes, post_comments,
  friendships, messages, reports to authenticated;

grant delete on profile_interests, post_likes, friendships to authenticated;

-- The column locks. RLS still applies on top (own-row-only etc.) -- this
-- controls WHICH FIELDS a write may touch at all.
revoke update on profiles, posts, friendships from authenticated;
grant update (display_name, bio, branch, hostel_block, intent, avatar_url,
  discoverable, batch) on profiles to authenticated;
grant update (content, image_url, deleted_at) on posts to authenticated;
grant update (status, responded_at) on friendships to authenticated;

-- ============================================================
-- 3. with-check on update policies (belt and braces with the grants)
-- ============================================================
drop policy if exists posts_delete_own on posts;
drop policy if exists posts_update_own on posts;
create policy posts_update_own on posts
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists friendships_update on friendships;
create policy friendships_update on friendships
  for update to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

-- ============================================================
-- 4. batch is derived, not claimed, once verified
-- ============================================================
-- Fires after trg_parse_college_email (alphabetical order), so a fresh
-- college-email link still sets batch correctly (old.year_code is null on
-- that first pass).
create or replace function protect_profile_fields()
returns trigger as $$
begin
  if old.year_code is not null then
    new.batch := old.year_code::int - 22;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_profile_fields on profiles;
create trigger trg_protect_profile_fields
  before update on profiles
  for each row execute function protect_profile_fields();

-- ============================================================
-- 6. Storage: owners can delete their own uploads
-- ============================================================
drop policy if exists "post-images owner delete" on storage.objects;
create policy "post-images owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
