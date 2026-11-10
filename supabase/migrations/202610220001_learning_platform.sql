create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.academy_role as enum ('student', 'instructor', 'admin');
exception when duplicate_object then null;
end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'en')),
  role public.academy_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_ar text not null,
  title_en text not null,
  description_ar text not null default '',
  description_en text not null default '',
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  cover_url text,
  instructor_id uuid not null references public.profiles(id),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('pending', 'active', 'completed', 'cancelled')),
  enrolled_at timestamptz not null default now(),
  unique(course_id, student_id)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null check (position > 0),
  title_ar text not null,
  title_en text not null,
  content_ar text not null default '',
  content_en text not null default '',
  video_provider text check (video_provider in ('google_drive', 'youtube', 'vimeo')),
  video_url text,
  video_file_id text,
  duration_minutes integer not null default 0 check (duration_minutes >= 0 and duration_minutes <= 1440),
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique(course_id, position)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  storage_path text unique,
  drive_file_id text,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (num_nonnulls(storage_path, drive_file_id) = 1)
);

create table public.lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key(student_id, lesson_id)
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  note text not null default '' check (length(note) <= 2000),
  submitted_at timestamptz not null default now()
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  title_ar text not null default 'اختبار الدرس',
  title_en text not null default 'Lesson quiz',
  passing_percent integer not null default 70 check (passing_percent between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position integer not null check (position > 0),
  question_ar text not null,
  question_en text not null,
  options_ar jsonb not null check (jsonb_typeof(options_ar) = 'array' and jsonb_array_length(options_ar) between 2 and 6),
  options_en jsonb not null check (jsonb_typeof(options_en) = 'array' and jsonb_array_length(options_en) between 2 and 6),
  unique(quiz_id, position)
);

create table public.quiz_answers (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_option integer not null check (correct_option between 0 and 5),
  explanation_ar text not null default '',
  explanation_en text not null default ''
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score_percent integer not null check (score_percent between 0 and 100),
  passed boolean not null,
  created_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  certificate_code text not null unique default upper(encode(extensions.gen_random_bytes(8), 'hex')),
  issued_at timestamptz not null default now(),
  unique(course_id, student_id)
);

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 6000),
  created_at timestamptz not null default now()
);

create table public.assistant_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key(user_id, window_start)
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meet_url text not null,
  google_event_id text not null unique,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index courses_published_idx on public.courses(is_published, created_at desc);
create index lessons_course_position_idx on public.lessons(course_id, position);
create index enrollments_student_status_idx on public.enrollments(student_id, status);
create index progress_student_idx on public.lesson_progress(student_id);
create index assignment_submissions_lesson_student_idx on public.assignment_submissions(lesson_id, student_id, submitted_at desc);
create index assistant_messages_conversation_idx on public.assistant_messages(conversation_id, created_at);
create index live_sessions_course_start_idx on public.live_sessions(course_id, starts_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger courses_updated_at before update on public.courses
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.consume_assistant_quota(p_user_id uuid, p_limit integer default 20)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean;
begin
  insert into public.assistant_usage (user_id, window_start, request_count)
  values (p_user_id, date_trunc('hour', now()), 1)
  on conflict (user_id, window_start) do update
    set request_count = public.assistant_usage.request_count + 1
    where public.assistant_usage.request_count < p_limit
  returning request_count <= p_limit into allowed;
  return coalesce(allowed, false);
end;
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_usage enable row level security;
alter table public.live_sessions enable row level security;

create or replace function public.current_academy_role()
returns public.academy_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = (select auth.uid());
$$;
revoke all on function public.current_academy_role() from public, anon;
grant execute on function public.current_academy_role() to authenticated, service_role;

create policy "Profiles visible to their owner and course instructors"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.enrollments e
    join public.courses c on c.id = e.course_id
    where e.student_id = profiles.id and c.instructor_id = (select auth.uid())
  )
  or public.current_academy_role() = 'admin'
);
create policy "Users update their public profile fields"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, preferred_language) on public.profiles to authenticated;

create policy "Published courses are public"
on public.courses for select to anon, authenticated
using (
  is_published
  or instructor_id = (select auth.uid())
  or public.current_academy_role() = 'admin'
);
create policy "Instructors manage their courses"
on public.courses for insert to authenticated
with check (
  instructor_id = (select auth.uid())
  and public.current_academy_role() in ('instructor', 'admin')
);
create policy "Instructors update their courses"
on public.courses for update to authenticated
using (
  instructor_id = (select auth.uid())
  or public.current_academy_role() = 'admin'
)
with check (
  instructor_id = (select auth.uid())
  or public.current_academy_role() = 'admin'
);
create policy "Instructors delete their courses"
on public.courses for delete to authenticated
using (
  instructor_id = (select auth.uid())
  or public.current_academy_role() = 'admin'
);

create policy "Users view their own enrollments; instructors view course enrollments"
on public.enrollments for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (select 1 from public.courses c where c.id = enrollments.course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
);
create policy "Students self-enroll in published courses"
on public.enrollments for insert to authenticated
with check (
  student_id = (select auth.uid())
  and status = 'active'
  and exists (select 1 from public.courses c where c.id = course_id and c.is_published)
);
create policy "Instructors manage course enrollments"
on public.enrollments for update to authenticated
using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
)
with check (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
);

create policy "Students view preview and enrolled lessons"
on public.lessons for select to anon, authenticated
using (
  is_preview and exists (select 1 from public.courses c where c.id = lessons.course_id and c.is_published)
  or exists (select 1 from public.courses c where c.id = lessons.course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
  or exists (
    select 1 from public.enrollments e
    where e.course_id = lessons.course_id and e.student_id = (select auth.uid()) and e.status in ('active', 'completed')
  )
);
create policy "Instructors create lessons in their courses"
on public.lessons for insert to authenticated
with check (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
);
create policy "Instructors update lessons in their courses"
on public.lessons for update to authenticated
using (
  exists (select 1 from public.courses c where c.id = lessons.course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
)
with check (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
);
create policy "Instructors delete lessons in their courses"
on public.lessons for delete to authenticated
using (
  exists (select 1 from public.courses c where c.id = lessons.course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
);

create policy "Enrolled students and course instructors view resources"
on public.resources for select to authenticated
using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = resources.lesson_id
    and (c.instructor_id = (select auth.uid())
      or exists (select 1 from public.enrollments e where e.course_id = c.id and e.student_id = (select auth.uid()) and e.status in ('active', 'completed'))
      or public.current_academy_role() = 'admin')
  )
);
create policy "Instructors add resources to their lessons"
on public.resources for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_id and c.instructor_id = (select auth.uid())
  )
  or public.current_academy_role() = 'admin'
);
create policy "Instructors delete their resources"
on public.resources for delete to authenticated
using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = resources.lesson_id and c.instructor_id = (select auth.uid())
  )
  or public.current_academy_role() = 'admin'
);

create policy "Students manage their lesson progress"
on public.lesson_progress for all to authenticated
using (
  student_id = (select auth.uid())
  and exists (select 1 from public.enrollments e join public.lessons l on l.course_id = e.course_id where l.id = lesson_id and e.student_id = (select auth.uid()) and e.status in ('active', 'completed'))
)
with check (
  student_id = (select auth.uid())
  and exists (select 1 from public.enrollments e join public.lessons l on l.course_id = e.course_id where l.id = lesson_id and e.student_id = (select auth.uid()) and e.status in ('active', 'completed'))
);

create policy "Students submit and instructors review assignments"
on public.assignment_submissions for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = assignment_submissions.lesson_id and c.instructor_id = (select auth.uid())
  )
  or public.current_academy_role() = 'admin'
);
create policy "Enrolled students submit their own assignment files"
on public.assignment_submissions for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_id and e.student_id = (select auth.uid()) and e.status in ('active', 'completed')
  )
);

create policy "Enrolled students and instructors view quizzes"
on public.quizzes for select to authenticated
using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.instructor_id = (select auth.uid()))
  or exists (select 1 from public.lessons l join public.enrollments e on e.course_id = l.course_id where l.id = lesson_id and e.student_id = (select auth.uid()) and e.status in ('active', 'completed'))
  or public.current_academy_role() = 'admin'
);
create policy "Instructors manage quizzes"
on public.quizzes for all to authenticated
using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
)
with check (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
);
create policy "Enrolled students read quiz questions"
on public.quiz_questions for select to authenticated
using (
  exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.enrollments e on e.course_id = l.course_id
    where q.id = quiz_id and e.student_id = (select auth.uid()) and e.status in ('active', 'completed')
  )
  or exists (
    select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id join public.courses c on c.id = l.course_id
    where q.id = quiz_id and c.instructor_id = (select auth.uid())
  )
  or public.current_academy_role() = 'admin'
);
create policy "Instructors manage quiz questions"
on public.quiz_questions for all to authenticated
using (
  exists (select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id join public.courses c on c.id = l.course_id where q.id = quiz_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
)
with check (
  exists (select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id join public.courses c on c.id = l.course_id where q.id = quiz_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
);
create policy "Quiz answers are never exposed through the client API"
on public.quiz_answers for all to authenticated using (false) with check (false);

create policy "Students and instructors view quiz attempts"
on public.quiz_attempts for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id join public.courses c on c.id = l.course_id
    where q.id = quiz_id and c.instructor_id = (select auth.uid())
  )
  or public.current_academy_role() = 'admin'
);

create policy "Students and instructors view certificates"
on public.certificates for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (select 1 from public.courses c where c.id = certificates.course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
);

create policy "Users view their assistant conversations"
on public.assistant_conversations for select to authenticated
using (student_id = (select auth.uid()));
create policy "Users create assistant conversations"
on public.assistant_conversations for insert to authenticated
with check (student_id = (select auth.uid()));
create policy "Users view messages in their conversations"
on public.assistant_messages for select to authenticated
using (exists (select 1 from public.assistant_conversations c where c.id = conversation_id and c.student_id = (select auth.uid())));
create policy "Assistant messages are written by the protected tutor function"
on public.assistant_messages for insert to authenticated
with check (false);
create policy "Usage limits are server managed"
on public.assistant_usage for all to authenticated using (false) with check (false);

create policy "Instructors manage live sessions"
on public.live_sessions for all to authenticated
using (
  instructor_id = (select auth.uid())
  or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = (select auth.uid()))
  or public.current_academy_role() = 'admin'
)
with check (
  instructor_id = (select auth.uid())
  and exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = (select auth.uid()))
);
create policy "Enrolled students view scheduled course sessions"
on public.live_sessions for select to authenticated
using (
  exists (select 1 from public.enrollments e where e.course_id = live_sessions.course_id and e.student_id = (select auth.uid()) and e.status in ('active', 'completed'))
);

grant select on public.courses, public.lessons to anon, authenticated;
grant select, update (full_name, avatar_url, preferred_language) on public.profiles to authenticated;
grant select on public.enrollments, public.resources, public.lesson_progress, public.quizzes,
  public.quiz_questions, public.quiz_attempts, public.certificates,
  public.assistant_conversations, public.assistant_messages, public.live_sessions to authenticated;
grant select, insert on public.assignment_submissions to authenticated;
grant insert on public.enrollments to authenticated;
grant insert, update, delete on public.courses, public.lessons, public.quizzes, public.quiz_questions to authenticated;
grant insert, update, delete on public.lesson_progress to authenticated;
grant insert, delete on public.resources to authenticated;
revoke all on public.quiz_answers, public.assistant_usage from anon, authenticated;
revoke all on public.profiles from anon;
grant execute on function public.consume_assistant_quota(uuid, integer) to service_role;
revoke all on function public.consume_assistant_quota(uuid, integer) from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy-resources',
  'academy-resources',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Instructors upload files to their course folders"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'academy-resources'
  and exists (
    select 1 from public.courses c
    where c.id::text = split_part(name, '/', 1) and c.instructor_id = (select auth.uid())
  )
);
create policy "Enrolled students and instructors read course files"
on storage.objects for select to authenticated
using (
  bucket_id = 'academy-resources'
  and exists (
    select 1 from public.resources r
    join public.lessons l on l.id = r.lesson_id
    join public.courses c on c.id = l.course_id
    where r.storage_path = name
    and (
      c.instructor_id = (select auth.uid())
      or exists (select 1 from public.enrollments e where e.course_id = c.id and e.student_id = (select auth.uid()) and e.status in ('active', 'completed'))
    )
  )
);
create policy "Instructors delete files from their course folders"
on storage.objects for delete to authenticated
using (
  bucket_id = 'academy-resources'
  and exists (
    select 1 from public.courses c
    where c.id::text = split_part(name, '/', 1) and c.instructor_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy-submissions',
  'academy-submissions',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Enrolled students upload their own submissions"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'academy-submissions'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and exists (
    select 1 from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id::text = split_part(name, '/', 3)
      and l.course_id::text = split_part(name, '/', 1)
      and e.student_id = (select auth.uid())
      and e.status in ('active', 'completed')
  )
);
create policy "Students and their instructors read submissions"
on storage.objects for select to authenticated
using (
  bucket_id = 'academy-submissions'
  and exists (
    select 1 from public.assignment_submissions s
    join public.lessons l on l.id = s.lesson_id
    join public.courses c on c.id = l.course_id
    where s.storage_path = name
      and (s.student_id = (select auth.uid())
        or c.instructor_id = (select auth.uid())
        or public.current_academy_role() = 'admin')
  )
);
