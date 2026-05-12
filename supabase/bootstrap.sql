create extension if not exists pgcrypto;

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'todos'
      and policyname = 'Public can read todos'
  ) then
    create policy "Public can read todos"
      on public.todos
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

insert into public.todos (name)
select sample_name
from (
  values
    ('Connect Supabase project'),
    ('Verify public table read'),
    ('Replace demo query with a real app table')
) as samples(sample_name)
where not exists (
  select 1 from public.todos
);
