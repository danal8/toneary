-- Toneary only. Other applications and their Auth settings are unchanged.
create table public.toneary_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  album_id uuid not null,
  album jsonb not null check (jsonb_typeof(album) = 'object' and octet_length(album::text) < 50000),
  favorite boolean not null default false,
  listen_later boolean not null default false,
  rating smallint check (rating between 1 and 5),
  note text not null default '' check (length(note) <= 5000),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, album_id)
);
alter table public.toneary_library enable row level security;
revoke all on public.toneary_library from anon;
grant select, insert, update, delete on public.toneary_library to authenticated;
create policy toneary_read_own on public.toneary_library for select to authenticated using ((select auth.uid()) = user_id);
create policy toneary_insert_own on public.toneary_library for insert to authenticated with check ((select auth.uid()) = user_id);
create policy toneary_update_own on public.toneary_library for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy toneary_delete_own on public.toneary_library for delete to authenticated using ((select auth.uid()) = user_id);

-- Apply changed fields, rather than replacing a user's entire library.
-- Concurrent updates to a rating and a note therefore do not erase each other.
create function public.toneary_sync_entries(p_entries jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare e jsonb; c jsonb; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 300 then raise exception 'Invalid batch'; end if;
  for e in select value from jsonb_array_elements(p_entries) loop
    c := e->'changes';
    if jsonb_typeof(c) <> 'object' or jsonb_typeof(e->'album') <> 'object' then raise exception 'Invalid entry'; end if;
    insert into public.toneary_library(user_id,album_id,album,favorite,listen_later,rating,note)
    values(uid,(e->>'id')::uuid,e->'album',coalesce((c->>'favorite')::boolean,false),coalesce((c->>'listenLater')::boolean,false),(c->>'rating')::smallint,coalesce(c->>'note',''))
    on conflict(user_id,album_id) do update set
      album = excluded.album,
      favorite = case when c ? 'favorite' then excluded.favorite else public.toneary_library.favorite end,
      listen_later = case when c ? 'listenLater' then excluded.listen_later else public.toneary_library.listen_later end,
      rating = case when c ? 'rating' then excluded.rating else public.toneary_library.rating end,
      note = case when c ? 'note' then excluded.note else public.toneary_library.note end,
      updated_at = now();
  end loop;
end;
$$;
revoke all on function public.toneary_sync_entries(jsonb) from public, anon;
grant execute on function public.toneary_sync_entries(jsonb) to authenticated;
