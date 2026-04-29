-- CLIENTS
create table clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text not null,
  owner_email text not null,
  owner_notify_number text not null,
  twilio_number text not null unique,
  industry text not null,
  booking_link text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now()
);

-- FLOWS
create table flows (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  opening_message text not null,
  questions jsonb not null default '[]',
  high_intent_triggers jsonb not null default '[]',
  high_intent_action text not null default 'notify_owner' check (high_intent_action in ('notify_owner', 'booking_link')),
  high_intent_message text not null,
  standard_message text not null,
  low_intent_message text not null,
  updated_at timestamptz default now()
);

-- LEADS
create table leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  caller_number text not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text not null default 'new' check (status in ('new', 'in_progress', 'qualified', 'booked', 'lost')),
  intent_level text check (intent_level in ('high', 'medium', 'low')),
  current_question_index integer default 0,
  transcript jsonb not null default '[]'
);

-- MESSAGES
create table messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  sent_at timestamptz default now()
);

-- CLIENT USERS (auth link)
create table client_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  unique(client_id, user_id)
);

-- ERRORS
create table errors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  lead_id uuid,
  context text,
  error_message text,
  occurred_at timestamptz default now()
);

-- RLS
alter table clients enable row level security;
alter table flows enable row level security;
alter table leads enable row level security;
alter table messages enable row level security;
alter table client_users enable row level security;
alter table errors enable row level security;

-- Client policies
create policy "clients: own data only"
on clients for select
using (
  id in (
    select client_id from client_users
    where user_id = auth.uid()
  )
);

create policy "flows: own data only"
on flows for select
using (
  client_id in (
    select client_id from client_users
    where user_id = auth.uid()
  )
);

create policy "leads: own data only"
on leads for select
using (
  client_id in (
    select client_id from client_users
    where user_id = auth.uid()
  )
);

create policy "messages: own data only"
on messages for select
using (
  client_id in (
    select client_id from client_users
    where user_id = auth.uid()
  )
);
