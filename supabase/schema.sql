-- ============================================================================
-- linger. — Production PostgreSQL + Row Level Security (RLS) Schema for Supabase
-- Implements Sections 3, 7, and 8 of the Product Requirements:
-- 1. Event-specific temporary rooms (manual organiser closure)
-- 2. 8-second live selfie video profiles (face, hair, outfit)
-- 3. Privacy-preserving proximity ranking (never exposes raw GPS coordinates)
-- 4. Identified interest (never anonymous) & private declines
-- 5. Mutual matching & post-match private chat
-- 6. Blocking, reporting, and discovery pausing
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. EVENTS / ROOMS TABLE
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  venue text not null,
  city text not null default 'Lagos',
  category text not null default 'rave' check (category in ('rave', 'festival', 'party', 'gathering')),
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2. ATTENDEE PROFILES (Event-Specific Temporary Profiles)
-- Note: lat and lng are stored in a separate protected table or restricted via RPC
-- so that raw GPS coordinates are NEVER selectable by other attendees.
create table if not exists public.attendee_profiles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  device_token text not null,
  display_name text not null,
  look_summary text not null default 'Tonight''s live 8s selfie look',
  contact_handle text,
  video_url text not null,
  is_discoverable boolean not null default true,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, device_token)
);

-- 3. PRIVATE ATTENDEE LOCATIONS (Strict RLS: No client SELECT allowed)
create table if not exists public.attendee_locations (
  profile_id uuid primary key references public.attendee_profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

-- 4. EXPRESSED INTERESTS (Identified Interest - Never Anonymous)
create table if not exists public.expressed_interests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sender_profile_id uuid not null references public.attendee_profiles(id) on delete cascade,
  recipient_profile_id uuid not null references public.attendee_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'mutual_match', 'declined')),
  created_at timestamptz not null default now(),
  unique (event_id, sender_profile_id, recipient_profile_id)
);

-- 5. MUTUAL MATCHES
create table if not exists public.mutual_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_a_id uuid not null references public.attendee_profiles(id) on delete cascade,
  profile_b_id uuid not null references public.attendee_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, profile_a_id, profile_b_id)
);

-- 6. POST-MATCH PRIVATE MESSAGES (Unlocked only after mutual match)
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.mutual_matches(id) on delete cascade,
  sender_profile_id uuid not null references public.attendee_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- 7. BLOCKS & SAFETY REPORTS
create table if not exists public.blocks_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  reporter_profile_id uuid not null references public.attendee_profiles(id) on delete cascade,
  reported_profile_id uuid not null references public.attendee_profiles(id) on delete cascade,
  reason text default 'Reported in room',
  created_at timestamptz not null default now(),
  unique (event_id, reporter_profile_id, reported_profile_id)
);

-- ============================================================================
-- PRIVACY-PRESERVING PROXIMITY BAND RPC FUNCTION (Section 3.8 & 7.2)
-- Computes approximate proximity bands ('very_nearby', 'nearby', 'at_event')
-- on the server without ever returning raw GPS coordinates to any client.
-- ============================================================================
create or replace function public.get_room_profiles_by_proximity(
  p_event_id uuid,
  p_viewer_profile_id uuid
)
returns table (
  id uuid,
  event_id uuid,
  display_name text,
  look_summary text,
  video_url text,
  recorded_at timestamptz,
  proximity_band text
)
language sql
security definer
as $$
  with viewer_loc as (
    select lat, lng
    from public.attendee_locations
    where profile_id = p_viewer_profile_id
  )
  select
    ap.id,
    ap.event_id,
    ap.display_name,
    ap.look_summary,
    ap.video_url,
    ap.recorded_at,
    case
      when vl.lat is null or al.lat is null then 'at_event'
      -- Haversine distance in meters
      when (
        6371000 * 2 * asin(
          sqrt(
            power(sin(radians(al.lat - vl.lat) / 2), 2) +
            cos(radians(vl.lat)) * cos(radians(al.lat)) *
            power(sin(radians(al.lng - vl.lng) / 2), 2)
          )
        )
      ) <= 35 then 'very_nearby'
      when (
        6371000 * 2 * asin(
          sqrt(
            power(sin(radians(al.lat - vl.lat) / 2), 2) +
            cos(radians(vl.lat)) * cos(radians(al.lat)) *
            power(sin(radians(al.lng - vl.lng) / 2), 2)
          )
        )
      ) <= 120 then 'nearby'
      else 'at_event'
    end as proximity_band
  from public.attendee_profiles ap
  left join public.attendee_locations al on al.profile_id = ap.id
  left join viewer_loc vl on true
  where ap.event_id = p_event_id
    and ap.is_discoverable = true
    and ap.id <> p_viewer_profile_id
    and not exists (
      select 1 from public.blocks_reports br
      where br.event_id = p_event_id
        and (
          (br.reporter_profile_id = p_viewer_profile_id and br.reported_profile_id = ap.id)
          or
          (br.reporter_profile_id = ap.id and br.reported_profile_id = p_viewer_profile_id)
        )
    )
  order by
    case
      when vl.lat is not null and al.lat is not null then
        6371000 * 2 * asin(
          sqrt(
            power(sin(radians(al.lat - vl.lat) / 2), 2) +
            cos(radians(vl.lat)) * cos(radians(al.lat)) *
            power(sin(radians(al.lng - vl.lng) / 2), 2)
          )
        )
      else 999999
    end asc,
    ap.recorded_at desc;
$$;

-- Enable Row Level Security on all tables
alter table public.events enable row level security;
alter table public.attendee_profiles enable row level security;
alter table public.attendee_locations enable row level security;
alter table public.expressed_interests enable row level security;
alter table public.mutual_matches enable row level security;
alter table public.chat_messages enable row level security;
alter table public.blocks_reports enable row level security;
