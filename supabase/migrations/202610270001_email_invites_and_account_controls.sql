alter table public.profiles
  add column if not exists is_active boolean not null default true;

create table public.academy_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.academy_role not null check (role in ('student', 'instructor', 'admin')),
  status text not null default 'inviting'
    check (status in ('approved', 'inviting', 'invited', 'active', 'suspended', 'revoked', 'failed')),
  invited_by uuid references public.profiles(id) on delete set null,
  user_id uuid unique references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academy_invites_email_normalized check (email = lower(trim(email)))
);

create unique index academy_invites_email_unique on public.academy_invites (lower(email));
create index academy_invites_status_idx on public.academy_invites (status, invited_at desc);
alter table public.academy_invites enable row level security;
revoke all on public.academy_invites from public, anon, authenticated;
grant all on public.academy_invites to service_role;

create trigger academy_invites_updated_at before update on public.academy_invites
for each row execute function public.set_updated_at();

create or replace function public.is_active_academy_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
  );
$$;
revoke all on function public.is_active_academy_user() from public, anon;
grant execute on function public.is_active_academy_user() to authenticated, service_role;

create or replace function public.current_academy_role()
returns public.academy_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and is_active;
$$;
revoke all on function public.current_academy_role() from public, anon;
grant execute on function public.current_academy_role() to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited_role public.academy_role;
begin
  select role into invited_role
  from public.academy_invites
  where lower(email) = lower(new.email)
    and status in ('approved', 'inviting', 'invited')
  for update;

  if not found then
    raise exception 'This email address is not approved for academy access.';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url',
    invited_role,
    true
  )
  on conflict (id) do update
    set email = excluded.email, role = excluded.role, is_active = true;

  update public.academy_invites
  set user_id = new.id,
      status = case when new.email_confirmed_at is null then 'invited' else 'active' end,
      accepted_at = new.email_confirmed_at
  where lower(email) = lower(new.email);

  return new;
end;
$$;

create or replace function public.sync_academy_invite_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
    and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at) then
    update public.academy_invites
    set status = case when status = 'revoked' then status else 'active' end,
        user_id = new.id,
        accepted_at = coalesce(accepted_at, new.email_confirmed_at)
    where lower(email) = lower(new.email)
      and status in ('approved', 'inviting', 'invited', 'active');
  end if;
  return new;
end;
$$;
revoke all on function public.sync_academy_invite_confirmation() from public, anon, authenticated;

create trigger academy_invites_sync_confirmation
after update of email_confirmed_at on auth.users
for each row execute function public.sync_academy_invite_confirmation();

create or replace function public.redeem_initial_admin_invite(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  rows_inserted integer;
  rows_updated integer;
begin
  insert into public.admin_invite_redemptions (invite_key, user_id)
  values ('initial-admin', target_user_id)
  on conflict (invite_key) do nothing;
  get diagnostics rows_inserted = row_count;

  if rows_inserted = 0 then
    return false;
  end if;

  update public.profiles
  set role = 'admin', updated_at = now()
  where id = target_user_id and role = 'student' and is_active;
  get diagnostics rows_updated = row_count;

  if rows_updated <> 1 then
    raise exception 'Only an active, approved student account can redeem the initial administrator invite.';
  end if;

  update public.academy_invites
  set role = 'admin', status = 'active'
  where user_id = target_user_id and status in ('approved', 'inviting', 'invited', 'active');

  return true;
end;
$$;
revoke all on function public.redeem_initial_admin_invite(uuid) from public, anon, authenticated;
grant execute on function public.redeem_initial_admin_invite(uuid) to service_role;

do $$
declare
  table_name text;
  protected_tables text[] := array[
    'profiles', 'courses', 'enrollments', 'lessons', 'resources',
    'lesson_progress', 'assignment_submissions', 'quizzes', 'quiz_questions',
    'quiz_answers', 'quiz_attempts', 'certificates', 'assistant_conversations',
    'assistant_messages', 'assistant_usage', 'live_sessions',
    'admin_invite_redemptions', 'academy_invites'
  ];
begin
  foreach table_name in array protected_tables loop
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (public.is_active_academy_user()) with check (public.is_active_academy_user())',
      'active_academy_users_only',
      table_name
    );
  end loop;
end;
$$;

create policy "Active academy users only"
on storage.objects as restrictive for all to authenticated
using (public.is_active_academy_user())
with check (public.is_active_academy_user());
