-- Cleanup duplicate appointments tables
-- Remove old appointments_* tables (with 's' at the end)

-- Drop tables in correct order (foreign keys first)
drop table if exists public.appointments_appointments cascade;
drop table if exists public.appointments_settings cascade;
drop table if exists public.appointments_availability cascade;
drop table if exists public.appointments_time_off cascade;
drop table if exists public.appointments_services cascade;
drop table if exists public.appointments_clients cascade;

-- Drop the old enum type if it exists
do $$
begin
  if exists (select 1 from pg_type where typname = 'appointments_appointment_status') then
    drop type public.appointments_appointment_status cascade;
  end if;
end
$$;
