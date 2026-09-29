-- Astro Palm — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists public.user_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  free_predictions_used int not null default 0,
  free_chat_questions_used int not null default 0,
  paid_credits int not null default 0 check (paid_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  palm_image_path text not null,
  prediction jsonb not null,
  -- true when the reading was paid for with a credit (unlocks unlimited chat)
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists readings_user_id_created_at_idx on public.readings (user_id, created_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.readings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_reading_id_created_at_idx on public.chat_messages (reading_id, created_at);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  amount_paise int not null default 9900,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  credits_added int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_id_idx on public.payments (user_id);

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_usage_set_updated_at on public.user_usage;
create trigger user_usage_set_updated_at
  before update on public.user_usage
  for each row execute function public.set_updated_at();

-- Create the user_usage row automatically on sign-up (email or Google).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_usage (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.user_usage enable row level security;
alter table public.readings enable row level security;
alter table public.chat_messages enable row level security;
alter table public.payments enable row level security;

drop policy if exists "usage_select_own" on public.user_usage;
create policy "usage_select_own" on public.user_usage
  for select using (user_id = auth.uid());

drop policy if exists "readings_select_own" on public.readings;
create policy "readings_select_own" on public.readings
  for select using (user_id = auth.uid());
-- Readings are inserted by the server (service role) only, so a client can't
-- create a reading with is_paid = true and unlock free chat.

drop policy if exists "chat_select_own" on public.chat_messages;
create policy "chat_select_own" on public.chat_messages
  for select using (user_id = auth.uid());

drop policy if exists "chat_insert_own" on public.chat_messages;
create policy "chat_insert_own" on public.chat_messages
  for insert with check (user_id = auth.uid());

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (user_id = auth.uid());

-- user_usage and payments are only mutated via the service role key (bypasses RLS).

-- ─────────────────────────────────────────────────────────────
-- Atomic business logic (service role only)
-- ─────────────────────────────────────────────────────────────

-- Consumes one reading allowance (free first, then a paid credit) and inserts
-- the reading in the same transaction. Returns 'free', 'paid', or null when the
-- user has nothing left.
create or replace function public.create_reading(
  p_user uuid, p_reading_id uuid, p_path text, p_prediction jsonb
) returns text language plpgsql security definer set search_path = public as $$
declare
  tier text;
begin
  insert into public.user_usage (user_id) values (p_user) on conflict (user_id) do nothing;

  update public.user_usage
     set free_predictions_used = free_predictions_used + 1
   where user_id = p_user and free_predictions_used < 1
  returning 'free' into tier;

  if tier is null then
    update public.user_usage
       set paid_credits = paid_credits - 1
     where user_id = p_user and paid_credits > 0
    returning 'paid' into tier;
  end if;

  if tier is null then
    return null;
  end if;

  insert into public.readings (id, user_id, palm_image_path, prediction, is_paid)
  values (p_reading_id, p_user, p_path, p_prediction, tier = 'paid');

  return tier;
end;
$$;

-- Consumes the single lifetime free chat question. Returns true if consumed.
create or replace function public.consume_free_chat(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.user_usage
     set free_chat_questions_used = free_chat_questions_used + 1
   where user_id = p_user and free_chat_questions_used < 1;
  return found;
end;
$$;

-- Marks a verified payment successful and adds one credit, exactly once.
create or replace function public.complete_payment(
  p_user uuid, p_order_id text, p_payment_id text
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.payments
     set status = 'success', razorpay_payment_id = p_payment_id, credits_added = 1
   where user_id = p_user and razorpay_order_id = p_order_id and status = 'pending';

  if not found then
    -- Already processed (idempotent retry) or unknown order.
    return exists (
      select 1 from public.payments
       where user_id = p_user and razorpay_order_id = p_order_id and status = 'success'
    );
  end if;

  insert into public.user_usage (user_id) values (p_user) on conflict (user_id) do nothing;
  update public.user_usage set paid_credits = paid_credits + 1 where user_id = p_user;
  return true;
end;
$$;

revoke all on function public.create_reading(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.consume_free_chat(uuid) from public, anon, authenticated;
revoke all on function public.complete_payment(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_reading(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.consume_free_chat(uuid) to service_role;
grant execute on function public.complete_payment(uuid, text, text) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Storage: private palm-images bucket
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('palm-images', 'palm-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "palm_upload_own_folder" on storage.objects;
create policy "palm_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'palm-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "palm_read_own_folder" on storage.objects;
create policy "palm_read_own_folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'palm-images' and (storage.foldername(name))[1] = auth.uid()::text);
