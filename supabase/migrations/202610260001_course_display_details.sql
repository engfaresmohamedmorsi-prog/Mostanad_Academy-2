alter table public.courses
  add column if not exists duration_hours integer
    check (duration_hours is null or duration_hours between 1 and 1000),
  add column if not exists price_ar text not null default ''
    check (length(price_ar) <= 80),
  add column if not exists price_en text not null default ''
    check (length(price_en) <= 80),
  add column if not exists schedule_ar text not null default ''
    check (length(schedule_ar) <= 240),
  add column if not exists schedule_en text not null default ''
    check (length(schedule_en) <= 240);
