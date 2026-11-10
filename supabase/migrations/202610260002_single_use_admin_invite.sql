create table public.admin_invite_redemptions (
  invite_key text primary key check (invite_key = 'initial-admin'),
  user_id uuid not null unique,
  redeemed_at timestamptz not null default now()
);

alter table public.admin_invite_redemptions enable row level security;
revoke all on public.admin_invite_redemptions from public, anon, authenticated;
grant all on public.admin_invite_redemptions to service_role;

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
  where id = target_user_id and role = 'student';
  get diagnostics rows_updated = row_count;

  if rows_updated <> 1 then
    raise exception 'Only an existing student account can redeem the initial administrator invite.';
  end if;

  return true;
end;
$$;

revoke all on function public.redeem_initial_admin_invite(uuid) from public, anon, authenticated;
grant execute on function public.redeem_initial_admin_invite(uuid) to service_role;
