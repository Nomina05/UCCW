-- UCCW: ejecutar en Supabase > SQL Editor.
-- La autenticación se administra desde Authentication > Users.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  profile text not null check (profile in ('Administrator', 'Staff', 'Volunteer')) default 'Staff',
  name text not null,
  firstname text not null,
  address text,
  city text,
  zip_code text,
  email text not null,
  phone text,
  mobile_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_number text not null unique,
  service_date date,
  full_name text not null,
  date_of_birth date,
  last4_ssn text,
  ethnicity text,
  gender text,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  nationality text,
  household_size integer,
  children integer default 0,
  adults integer default 0,
  seniors integer default 0,
  spouse_name text,
  marital_status text,
  immigration_status text,
  income numeric(12,2),
  social_services boolean not null default false,
  other_services boolean not null default false,
  immigration boolean not null default false,
  health_and_wellness boolean not null default false,
  workers_resource_center boolean not null default false,
  educational_empowerment boolean not null default false,
  photo_url text,
  case_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_control (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  client_name text,
  case_status text not null check (case_status in ('Abierto', 'En proceso', 'Cerrado')) default 'Abierto',
  assigned_to text,
  follow_up_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donors (
  id uuid primary key default gen_random_uuid(),
  donor_number text not null unique,
  first_name text not null,
  last_name text not null,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  donation_date date,
  amount numeric(12,2),
  other_donations text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  volunteer_number text not null unique,
  status text not null check (status in ('Active', 'Inactive')) default 'Active',
  first_name text not null,
  last_name text not null,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  volunteer_date date,
  duties text,
  hours numeric(8,2),
  reason text,
  age integer,
  languages text,
  education text,
  commitment text,
  availability text,
  skills_contribution text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_records (
  id uuid primary key default gen_random_uuid(),
  service_type text not null check (service_type in ('food_distribution', 'clothing_drive')),
  service_date date not null,
  full_name text not null,
  address text,
  children integer default 0,
  adults integer default 0,
  seniors integer default 0,
  total_household integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.case_control enable row level security;
alter table public.donors enable row level security;
alter table public.volunteers enable row level security;
alter table public.service_records enable row level security;

-- Política inicial: todo usuario autenticado puede operar el sistema.
create policy "authenticated profiles" on public.profiles for all to authenticated using (true) with check (true);
create policy "authenticated clients" on public.clients for all to authenticated using (true) with check (true);
create policy "authenticated case control" on public.case_control for all to authenticated using (true) with check (true);
create policy "authenticated donors" on public.donors for all to authenticated using (true) with check (true);
create policy "authenticated volunteers" on public.volunteers for all to authenticated using (true) with check (true);
create policy "authenticated service records" on public.service_records for all to authenticated using (true) with check (true);
