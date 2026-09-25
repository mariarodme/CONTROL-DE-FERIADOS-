-- Ejecutar una vez en SQL Editor del proyecto Supabase.
-- Cada cuenta solo puede leer y guardar sus propios colaboradores y registros.
create table public.jornadas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.jornadas enable row level security;
revoke all on table public.jornadas from anon;
grant select, insert, update on table public.jornadas to authenticated;

create policy jornadas_ver on public.jornadas
  for select to authenticated using (user_id = (select auth.uid()));
create policy jornadas_crear on public.jornadas
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy jornadas_editar on public.jornadas
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create function public.save_jornadas(new_payload jsonb, expected_revision bigint)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved_revision bigint;
begin
  if owner_id is null then
    raise exception 'Iniciá sesión para guardar los datos';
  end if;
  if jsonb_typeof(new_payload->'employees') <> 'array'
     or jsonb_typeof(new_payload->'entries') <> 'array'
     or jsonb_typeof(new_payload->'holidays') <> 'array' then
    raise exception 'Formato de datos inválido';
  end if;
  if expected_revision = 0 then
    insert into public.jornadas(user_id, payload, revision)
    values (owner_id, new_payload, 1)
    on conflict (user_id) do nothing
    returning revision into saved_revision;
  else
    update public.jornadas
    set payload = new_payload, revision = revision + 1, updated_at = now()
    where user_id = owner_id and revision = expected_revision
    returning revision into saved_revision;
  end if;
  if saved_revision is null then
    raise exception 'Los datos cambiaron en otro dispositivo. Actualizá antes de guardar.';
  end if;
  return saved_revision;
end;
$$;

revoke all on function public.save_jornadas(jsonb, bigint) from public, anon;
grant execute on function public.save_jornadas(jsonb, bigint) to authenticated;
