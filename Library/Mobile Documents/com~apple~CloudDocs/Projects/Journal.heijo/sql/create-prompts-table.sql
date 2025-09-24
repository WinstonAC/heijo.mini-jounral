-- Create prompts table with proper schema and RLS policies
create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  date date,
  text_en text not null unique,     -- unique so re-seeds don't duplicate
  tags text[] not null default '{}',
  created_at timestamptz default now()
);

-- Enable row level security
alter table prompts enable row level security;

-- Create read policy for all users
create policy if not exists "prompts_read_all"
  on prompts for select using (true);
