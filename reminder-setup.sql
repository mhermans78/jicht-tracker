-- Eenmalig uitvoeren in Supabase (SQL Editor)
alter table profiles add column if not exists reminder_enabled boolean default true;
alter table profiles add column if not exists last_reminder_at timestamptz;
alter table profiles add column if not exists lang text default 'nl';
