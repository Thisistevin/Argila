-- Argila MVP — schema alinhado ao briefing §4 + extensões do PLANO_EXECUCAO_ARGILA.md
-- Executar via Supabase CLI ou SQL editor

create extension if not exists "pgcrypto";

-- ORGANIZAÇÕES (fase 2)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- PERFIS
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  organization_id uuid references public.organizations (id),
  asaas_customer_id text,
  abacate_customer_id text,
  created_at timestamptz default now()
);

-- ASSINATURAS
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('explorar', 'professor', 'escola')),
  billing_cycle text not null check (billing_cycle in ('free', 'monthly', 'annual')),
  status text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'cancelled')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  asaas_sub_id text,
  abacate_bill_id text,
  source text not null default 'system' check (source in ('system', 'asaas', 'abacatepay')),
  created_at timestamptz default now()
);

create index idx_subscriptions_professor_id on public.subscriptions (professor_id);

-- TURMAS / ALUNOS
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create index idx_classes_professor_id on public.classes (professor_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  name text not null,
  created_at timestamptz default now()
);

create index idx_students_professor_id on public.students (professor_id);
create index idx_students_class_id on public.students (class_id);

-- DIÁRIOS
create table public.diaries (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  lesson_type text check (lesson_type in ('theoretical', 'practical', 'mixed')),
  ai_classification jsonb,
  ai_summary text,
  attachment_storage_path text,
  attachment_content_type text,
  created_at timestamptz default now()
);

create index idx_diaries_professor_id on public.diaries (professor_id);

create table public.diary_classes (
  diary_id uuid not null references public.diaries (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  primary key (diary_id, class_id)
);

create index idx_diary_classes_diary on public.diary_classes (diary_id);
create index idx_diary_classes_class on public.diary_classes (class_id);

create table public.diary_students (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  absent boolean default false,
  comprehension_score smallint check (comprehension_score between 0 and 10),
  attention_score smallint check (attention_score between 0 and 10),
  engagement_score smallint check (engagement_score between 0 and 10),
  note text,
  created_at timestamptz default now(),
  unique (diary_id, student_id)
);

create index idx_diary_students_diary on public.diary_students (diary_id);
create index idx_diary_students_student on public.diary_students (student_id);

-- PROGRESSO / RELATÓRIOS
create table public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  overall_score numeric(4, 2),
  attention_trend text,
  attention_confidence numeric(3, 2),
  short_note text,
  last_diary_at timestamptz,
  updated_at timestamptz default now(),
  unique (student_id)
);

create index idx_student_progress_professor on public.student_progress (professor_id);
create index idx_student_progress_student on public.student_progress (student_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  title text,
  attention_trend text,
  highlights jsonb,
  suggestions jsonb,
  period_start date not null,
  period_end date not null,
  share_token text unique,
  created_at timestamptz default now()
);

create index idx_reports_professor on public.reports (professor_id);
create index idx_reports_student on public.reports (student_id);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in ('diary_scoring', 'report', 'attention_check')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  payload jsonb not null,
  result jsonb,
  model text,
  prompt_version text,
  attempt_count smallint default 0,
  last_error text,
  input_tokens integer,
  output_tokens integer,
  cost_cents integer,
  idempotency_key text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_ai_jobs_professor on public.ai_jobs (professor_id);
create index idx_ai_jobs_status on public.ai_jobs (status);

-- TRIGGER: novo usuário → profiles + subscriptions explorar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.diaries enable row level security;
alter table public.diary_classes enable row level security;
alter table public.diary_students enable row level security;
alter table public.student_progress enable row level security;
alter table public.reports enable row level security;
alter table public.ai_jobs enable row level security;

create policy profiles_own_select on public.profiles for select using (id = auth.uid());
create policy profiles_own_update on public.profiles for update using (id = auth.uid());

create policy subscriptions_own_select on public.subscriptions for select using (professor_id = auth.uid());

create policy classes_all on public.classes for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy students_all on public.students for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy diaries_all on public.diaries for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy diary_classes_all on public.diary_classes for all
  using (exists (select 1 from public.diaries d where d.id = diary_classes.diary_id and d.professor_id = auth.uid()))
  with check (exists (select 1 from public.diaries d where d.id = diary_classes.diary_id and d.professor_id = auth.uid()));

create policy diary_students_all on public.diary_students for all
  using (exists (select 1 from public.diaries d where d.id = diary_students.diary_id and d.professor_id = auth.uid()))
  with check (exists (select 1 from public.diaries d where d.id = diary_students.diary_id and d.professor_id = auth.uid()));

create policy student_progress_all on public.student_progress for all
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy reports_all on public.reports for all
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy ai_jobs_select on public.ai_jobs for select using (professor_id = auth.uid());
create policy ai_jobs_insert on public.ai_jobs for insert with check (professor_id = auth.uid());
create policy ai_jobs_update on public.ai_jobs for update using (professor_id = auth.uid());

-- STORAGE: bucket diary-attachments (criar bucket no dashboard se insert falhar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diary-attachments',
  'diary-attachments',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'audio/mpeg', 'video/mp4']::text[]
)
on conflict (id) do nothing;

create policy storage_diary_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'diary-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_diary_select on storage.objects for select to authenticated
  using (
    bucket_id = 'diary-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_diary_update on storage.objects for update to authenticated
  using (
    bucket_id = 'diary-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_diary_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'diary-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
