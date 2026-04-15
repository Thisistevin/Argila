-- Jornadas de aprendizado (v1.1)

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_journeys_professor on public.journeys (professor_id);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys (id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz default now()
);
create index idx_milestones_journey on public.milestones (journey_id);

create table public.student_journeys (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  journey_id uuid not null references public.journeys (id) on delete cascade,
  current_milestone_id uuid references public.milestones (id) on delete set null,
  ai_suggested_milestone_id uuid references public.milestones (id) on delete set null,
  ai_suggestion_note text,
  updated_at timestamptz default now(),
  unique (student_id, journey_id)
);
create index idx_student_journeys_student on public.student_journeys (student_id);
create index idx_student_journeys_journey on public.student_journeys (journey_id);

alter table public.ai_jobs drop constraint if exists ai_jobs_type_check;
alter table public.ai_jobs add constraint ai_jobs_type_check
  check (type in ('diary_scoring', 'report', 'attention_check', 'journey_suggestion'));

alter table public.journeys enable row level security;
alter table public.milestones enable row level security;
alter table public.student_journeys enable row level security;

create policy journeys_all on public.journeys for all
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

create policy milestones_all on public.milestones for all
  using (exists (
    select 1 from public.journeys j
    where j.id = milestones.journey_id and j.professor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.journeys j
    where j.id = milestones.journey_id and j.professor_id = auth.uid()
  ));

create policy student_journeys_all on public.student_journeys for all
  using (exists (
    select 1 from public.students s
    where s.id = student_journeys.student_id and s.professor_id = auth.uid()
  ) and exists (
    select 1 from public.journeys j
    where j.id = student_journeys.journey_id and j.professor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.students s
    where s.id = student_journeys.student_id and s.professor_id = auth.uid()
  ) and exists (
    select 1 from public.journeys j
    where j.id = student_journeys.journey_id and j.professor_id = auth.uid()
  ));
