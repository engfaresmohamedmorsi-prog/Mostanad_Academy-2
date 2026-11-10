alter table public.lesson_progress
  add column if not exists verified_by_quiz boolean not null default false;

update public.lesson_progress progress
set verified_by_quiz = true
from (
  select quiz_attempts.student_id, quizzes.lesson_id
  from public.quiz_attempts
  join public.quizzes on quizzes.id = quiz_attempts.quiz_id
  where quiz_attempts.passed = true
  group by quiz_attempts.student_id, quizzes.lesson_id
) verified_completions
where progress.student_id = verified_completions.student_id
  and progress.lesson_id = verified_completions.lesson_id;

drop policy if exists "Students manage their lesson progress" on public.lesson_progress;

create policy "Students view their own lesson progress"
on public.lesson_progress for select to authenticated
using (student_id = (select auth.uid()));

revoke insert, update, delete on public.lesson_progress from authenticated;
grant select on public.lesson_progress to authenticated;
