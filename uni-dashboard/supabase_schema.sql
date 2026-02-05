-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Degrees Table
create table degrees (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique, -- 'AI', 'IT', 'ITM'
  name text not null
);

-- 2. Batches Table
create table batches (
  id uuid primary key default uuid_generate_v4(),
  batch_code text not null, -- '21_Batch'
  degree_id uuid references degrees(id) on delete cascade not null,
  current_semester int not null default 1,
  constraint unique_batch_degree unique (batch_code, degree_id)
);

-- 3. Profiles (Users)
-- Extends Supabase Auth
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  index_number text unique not null,
  full_name text,
  batch_id uuid references batches(id) on delete set null,
  role text default 'student' -- 'student', 'admin'
);

-- 4. Modules
create table modules (
  id uuid primary key default uuid_generate_v4(),
  code text not null, -- 'AI1101'
  name text not null,
  semester int not null,
  degree_id uuid references degrees(id) on delete cascade not null,
  constraint unique_module_code unique (code, degree_id)
);

-- 5. Module Contents (Versioned)
create table module_contents (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid references modules(id) on delete cascade not null,
  batch_id uuid references batches(id) on delete cascade not null, -- The batch that created this version
  content_json jsonb not null default '{}'::jsonb, -- Structured content
  version_number int not null default 1,
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

-- Row Level Security (RLS)

-- Enable RLS
alter table degrees enable row level security;
alter table batches enable row level security;
alter table profiles enable row level security;
alter table modules enable row level security;
alter table module_contents enable row level security;

-- Policies

-- Public Read Access for basic info
create policy "Public read degrees" on degrees for select using (true);
create policy "Public read batches" on batches for select using (true);
create policy "Public read modules" on modules for select using (true);

-- Profiles: Users can see all profiles (to find classmates), edit own
create policy "Read all profiles" on profiles for select using (true);
create policy "Update own profile" on profiles for update using (auth.uid() = id);

-- Module Contents
-- Reading: Everyone can read active contents
create policy "Read active contents" on module_contents for select using (true);

-- Writing: STRICTEST RULE
-- Only allow insert/update if the user's batch's current_semester matches the module's semester
-- This logic usually requires a more complex check or a database function.

create or replace function can_edit_module(module_uuid uuid)
returns boolean as $$
declare
  user_batch_id uuid;
  user_batch_semester int;
  mod_semester int;
begin
  -- Get user's batch and that batch's current semester
  select b.id, b.current_semester into user_batch_id, user_batch_semester
  from profiles p
  join batches b on p.batch_id = b.id
  where p.id = auth.uid();

  -- Get module's semester
  select semester into mod_semester
  from modules
  where id = module_uuid;

  -- Logic: User must have a batch, and Batch Sem == Module Sem
  if user_batch_id is not null and user_batch_semester = mod_semester then
    return true;
  else
    return false;
  end if;
end;
$$ language plpgsql security definer;

-- Policy using the function
create policy "Edit if batch semester matches" on module_contents
for insert with check (
  can_edit_module(module_id)
);

create policy "Update if batch semester matches" on module_contents
for update using (
  can_edit_module(module_id)
);

-- Trigger to create Profile on Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, index_number, full_name)
  values (
    new.id,
    new.raw_user_meta_data->>'index_number',
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA

-- 1. Degrees
insert into degrees (code, name) values 
('AI', 'Artificial Intelligence'),
('IT', 'Information Technology'),
('ITM', 'IT Management')
on conflict (code) do nothing;

-- 2. Batches (Assuming AI Degree ID is resolved, but for SQL script we need nested select or vars. Using simple subqueries)
-- AI Batches
insert into batches (batch_code, degree_id, current_semester) values
('AI_Batch_21', (select id from degrees where code = 'AI'), 7),
('AI_Batch_22', (select id from degrees where code = 'AI'), 5),
('AI_Batch_23', (select id from degrees where code = 'AI'), 3),
('AI_Batch_24', (select id from degrees where code = 'AI'), 1);

-- 3. Modules (Sample)
-- Sem 1
insert into modules (code, name, semester, degree_id) values
('AI1101', 'Introduction to Artificial Intelligence', 1, (select id from degrees where code = 'AI')),
('AI1102', 'Programming Fundamentals', 1, (select id from degrees where code = 'AI'));

-- Sem 3
insert into modules (code, name, semester, degree_id) values
('AI2101', 'Data Structures & Algorithms', 3, (select id from degrees where code = 'AI'));

-- ENHANCED SEED DATA (All Batches 21-24)

-- Ensure Degrees exist (handling conflict)
insert into degrees (code, name) values 
('AI', 'Artificial Intelligence'),
('IT', 'Information Technology'),
('ITM', 'IT Management')
on conflict (code) do nothing;

-- Batches for IT
insert into batches (batch_code, degree_id, current_semester) values
('IT_Batch_21', (select id from degrees where code = 'IT'), 7),
('IT_Batch_22', (select id from degrees where code = 'IT'), 5),
('IT_Batch_23', (select id from degrees where code = 'IT'), 3),
('IT_Batch_24', (select id from degrees where code = 'IT'), 1)
on conflict do nothing;

-- Batches for ITM
insert into batches (batch_code, degree_id, current_semester) values
('ITM_Batch_21', (select id from degrees where code = 'ITM'), 7),
('ITM_Batch_22', (select id from degrees where code = 'ITM'), 5),
('ITM_Batch_23', (select id from degrees where code = 'ITM'), 3),
('ITM_Batch_24', (select id from degrees where code = 'ITM'), 1)
on conflict do nothing;

-- UPDATE TRIGGER to respect passed batch_id
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, index_number, full_name, batch_id)
  values (
    new.id,
    new.raw_user_meta_data->>'index_number',
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'batch_id')::uuid -- Cast to UUID
  );
  return new;
end;
$$ language plpgsql security definer;

-- Function to handle module view permissions based on user batch/semester
-- Allows all students within same batch year to see content (e.g. 23 batch sees 23 batch content)
-- But primarily students see content based on their relevant semester access.

-- For now, our RLS "Read active contents" is public (using true), which matches the request:
-- "all batch 23 students able to see all content" (if active).
-- We will refine this later if stricter read controls are needed.
