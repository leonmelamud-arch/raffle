-- Create a table for public profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin'))
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for "People" (managed by admins)
create table if not exists public.people (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text not null,
  email text,
  company text,
  notes text
);

-- Set up RLS for People table
alter table public.people enable row level security;

-- Policy: Admins can do everything on people table
drop policy if exists "Admins can manage people." on people;
create policy "Admins can manage people."
  on people
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Create a whitelist table for admins
create table if not exists public.admin_whitelist (
  email text primary key
);

-- Insert the admin emails
insert into public.admin_whitelist (email)
values 
  ('leonmelamud@gmail.com'), 
  ('leon.melamud@thetaray.com')
on conflict (email) do nothing;

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_admin boolean;
begin
  -- Check if the email is in the admin whitelist
  select exists(select 1 from public.admin_whitelist where email = new.email) into is_admin;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    case when is_admin then 'admin' else 'user' end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Retroactively set admin role for existing users if they are in the whitelist
update public.profiles
set role = 'admin'
where email in (select email from public.admin_whitelist);
