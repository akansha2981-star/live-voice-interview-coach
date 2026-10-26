create type public.app_role as enum ('admin', 'student');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  education text,
  graduation_year int,
  employment_status text,
  work_experience text,
  job_title text,
  industry text,
  target_role text,
  target_company text,
  interview_category text default 'general_mba',
  technical_skills text,
  functional_skills text,
  projects text,
  achievements text,
  career_objectives text,
  interview_language text default 'English',
  difficulty text default 'medium',
  linkedin_url text,
  concerns text,
  accessibility text,
  resume_path text,
  resume_summary text,
  use_resume boolean not null default true,
  use_concerns boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'student') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  delta int not null,
  reason text not null,
  created_by uuid,
  interview_id uuid,
  created_at timestamptz not null default now()
);
create index credit_ledger_user_idx on public.credit_ledger (user_id);
grant select, insert on public.credit_ledger to authenticated;
grant all on public.credit_ledger to service_role;
alter table public.credit_ledger enable row level security;
create policy "Own credits read" on public.credit_ledger for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins grant credits" on public.credit_ledger for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') and created_by = auth.uid() and interview_id is null);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null default 'in_progress',
  category text,
  difficulty text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_s int,
  transcript jsonb not null default '[]'::jsonb,
  vision_summary jsonb,
  speech_metrics jsonb,
  report jsonb,
  overall_score int,
  error text,
  created_at timestamptz not null default now()
);
create index interviews_user_idx on public.interviews (user_id, created_at desc);
grant select on public.interviews to authenticated;
grant all on public.interviews to service_role;
alter table public.interviews enable row level security;
create policy "Own interviews read" on public.interviews for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.credit_balance(_user_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger
  where user_id = _user_id and (_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
$$;

create or replace function public.start_interview()
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); bal int; iid uuid; p public.profiles;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select coalesce(sum(delta),0) into bal from public.credit_ledger where user_id = uid;
  if bal < 1 then raise exception 'No interview credits left'; end if;
  select * into p from public.profiles where id = uid;
  insert into public.interviews (user_id, category, difficulty)
    values (uid, p.interview_category, p.difficulty) returning id into iid;
  insert into public.credit_ledger (user_id, delta, reason, interview_id) values (uid, -1, 'Interview started', iid);
  return iid;
end $$;
revoke execute on function public.start_interview() from anon, public;
grant execute on function public.start_interview() to authenticated;

create policy "Own resume read" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')));
create policy "Own resume write" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Own resume update" on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);