-- Adiciona coluna phone à tabela profiles
alter table public.profiles add column if not exists phone text;

-- Recria handle_new_user capturando phone do metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    nullif(trim(new.raw_user_meta_data->>'phone'), '')
  );
  insert into public.subscriptions (
    professor_id, plan, billing_cycle, status, period_start, period_end, source
  )
  values (
    new.id,
    'explorar',
    'free',
    'active',
    now(),
    now(),
    'system'
  );
  return new;
end;
$$;

-- Sincroniza profiles.email quando auth.users.email é confirmado
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
