-- Copilot query functions.
--
-- The AI turns a question into ONE call to one of these, so Postgres does
-- all the counting/filtering (always exact, scales to any size) and the
-- model never holds the dataset. All are SECURITY DEFINER but only ever
-- read PUBLIC data: discoverable, non-deleted profiles and non-deleted
-- posts -- exactly what any student could already browse.

-- ── Aggregate stats ─────────────────────────────────────────────────────
create or replace function ai_stats()
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', (select count(*) from profiles where discoverable and deleted_at is null),
    'by_batch', (
      select coalesce(json_object_agg(label, c), '{}'::json) from (
        select coalesce('batch ' || batch::text, 'batch unknown') as label, count(*) c
        from profiles where discoverable and deleted_at is null group by batch
      ) t
    ),
    'by_intent', (
      select coalesce(json_object_agg(intent, c), '{}'::json) from (
        select intent, count(*) c
        from profiles where discoverable and deleted_at is null group by intent
      ) t
    ),
    'top_interests', (
      select coalesce(json_agg(json_build_object('name', name, 'count', c) order by c desc), '[]'::json)
      from (
        select i.name, count(*) c
        from profile_interests pi
        join interests i on i.id = pi.interest_id
        join profiles p on p.id = pi.profile_id
        where p.discoverable and p.deleted_at is null
        group by i.name order by c desc limit 12
      ) t
    ),
    'post_count', (select count(*) from posts where deleted_at is null)
  );
$$;

-- ── People search ───────────────────────────────────────────────────────
create or replace function ai_search_people(
  p_batch int default null,
  p_intent text default null,
  p_interests text[] default null,
  p_text text default null,
  p_limit int default 15
)
returns table (
  id uuid, name text, avatar_url text, batch int, branch text, bio text, intent text, interests text[]
)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, p.batch, p.branch, p.bio, p.intent,
    coalesce(array_agg(distinct i.name) filter (where i.name is not null), '{}')
  from profiles p
  left join profile_interests pi on pi.profile_id = p.id
  left join interests i on i.id = pi.interest_id
  where p.discoverable and p.deleted_at is null
    and (p_batch is null or p.batch = p_batch)
    and (p_intent is null or p_intent = 'either' or p.intent = p_intent or p.intent = 'either')
    and (p_text is null or p.display_name ilike '%' || p_text || '%' or p.bio ilike '%' || p_text || '%')
  group by p.id
  having (
    p_interests is null
    or bool_or(i.name ilike any (array(select '%' || x || '%' from unnest(p_interests) x)))
  )
  order by max(p.created_at) desc
  limit greatest(coalesce(p_limit, 15), 1);
$$;

-- ── People count (same filters) ─────────────────────────────────────────
create or replace function ai_count_people(
  p_batch int default null,
  p_intent text default null,
  p_interests text[] default null,
  p_text text default null
)
returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from (
    select p.id
    from profiles p
    left join profile_interests pi on pi.profile_id = p.id
    left join interests i on i.id = pi.interest_id
    where p.discoverable and p.deleted_at is null
      and (p_batch is null or p.batch = p_batch)
      and (p_intent is null or p_intent = 'either' or p.intent = p_intent or p.intent = 'either')
      and (p_text is null or p.display_name ilike '%' || p_text || '%' or p.bio ilike '%' || p_text || '%')
    group by p.id
    having (
      p_interests is null
      or bool_or(i.name ilike any (array(select '%' || x || '%' from unnest(p_interests) x)))
    )
  ) s;
$$;

-- ── Post search ─────────────────────────────────────────────────────────
create or replace function ai_search_posts(
  p_category text default null,
  p_text text default null,
  p_author text default null,
  p_since_days int default null,
  p_limit int default 15
)
returns table (
  id uuid, author_id uuid, author_name text, author_avatar text,
  content text, image_url text, category text,
  likes bigint, comments bigint, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select po.id, po.author_id, a.display_name, a.avatar_url, po.content, po.image_url, po.category,
    (select count(*) from post_likes pl where pl.post_id = po.id),
    (select count(*) from post_comments pc where pc.post_id = po.id),
    po.created_at
  from posts po
  join profiles a on a.id = po.author_id
  where po.deleted_at is null
    and (p_category is null or po.category = p_category)
    and (p_text is null or po.content ilike '%' || p_text || '%')
    and (p_author is null or a.display_name ilike '%' || p_author || '%')
    and (p_since_days is null or po.created_at >= now() - (p_since_days || ' days')::interval)
  order by po.created_at desc
  limit greatest(coalesce(p_limit, 15), 1);
$$;

grant execute on function ai_stats() to authenticated;
grant execute on function ai_search_people(int, text, text[], text, int) to authenticated;
grant execute on function ai_count_people(int, text, text[], text) to authenticated;
grant execute on function ai_search_posts(text, text, text, int, int) to authenticated;
