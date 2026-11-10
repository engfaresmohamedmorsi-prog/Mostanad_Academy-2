drop policy if exists "Instructors upload files to their course folders" on storage.objects;
create policy "Instructors and admins upload files to course folders"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'academy-resources'
  and (
    exists (
      select 1 from public.courses c
      where c.id::text = split_part(name, '/', 1)
        and c.instructor_id = (select auth.uid())
    )
    or public.current_academy_role() = 'admin'
  )
);

drop policy if exists "Enrolled students and instructors read course files" on storage.objects;
create policy "Enrolled students, instructors, and admins read course files"
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
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id
            and e.student_id = (select auth.uid())
            and e.status in ('active', 'completed')
        )
        or public.current_academy_role() = 'admin'
      )
  )
);

drop policy if exists "Instructors delete files from their course folders" on storage.objects;
create policy "Instructors and admins delete course files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'academy-resources'
  and (
    exists (
      select 1 from public.courses c
      where c.id::text = split_part(name, '/', 1)
        and c.instructor_id = (select auth.uid())
    )
    or public.current_academy_role() = 'admin'
  )
);

drop policy if exists "Instructors manage live sessions" on public.live_sessions;
create policy "Instructors and admins manage live sessions"
on public.live_sessions for all to authenticated
using (
  instructor_id = (select auth.uid())
  or exists (
    select 1 from public.courses c
    where c.id = course_id and c.instructor_id = (select auth.uid())
  )
  or public.current_academy_role() = 'admin'
)
with check (
  (
    instructor_id = (select auth.uid())
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.instructor_id = (select auth.uid())
    )
  )
  or public.current_academy_role() = 'admin'
);

grant update (status) on public.enrollments to authenticated;
grant insert, update, delete on public.live_sessions to authenticated;
