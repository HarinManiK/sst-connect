-- Bridges Supabase Auth (auth.users) to our profiles table.
--
-- Whatever email a student signs up with becomes both their login identity
-- and, if it happens to already be a @sst.scaler.com address, their
-- college_email (parsed into batch/year/student_id by trg_parse_college_email
-- from 0001_init.sql). If they sign up with a personal email, college_email
-- stays null until they later change their auth email to a college one --
-- which re-fires this same sync trigger.

create or replace function sync_profile_from_auth_user()
returns trigger as $$
declare
  is_college boolean;
begin
  is_college := new.email ~* '^[a-z]+\.\d{2}bcs\d+@sst\.scaler\.com$';

  if tg_op = 'INSERT' then
    insert into profiles (id, display_name, personal_email, college_email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
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

drop trigger if exists trg_sync_profile_on_auth_insert on auth.users;
create trigger trg_sync_profile_on_auth_insert
  after insert on auth.users
  for each row execute function sync_profile_from_auth_user();

drop trigger if exists trg_sync_profile_on_auth_email_change on auth.users;
create trigger trg_sync_profile_on_auth_email_change
  after update of email on auth.users
  for each row execute function sync_profile_from_auth_user();
