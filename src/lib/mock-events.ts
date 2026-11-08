import { EventDetails, RecordingStepPrompt, AttendeeProfile } from "@/types/event";

export const RECORDING_CONFIG = {
  MAX_DURATION_SECONDS: 8,
  MIN_DURATION_SECONDS: 3,
} as const;

export const RECORDING_PROMPTS: RecordingStepPrompt[] = [
  {
    id: "face_hair",
    startSecond: 0,
    endSecond: 3,
    title: "Show your face & hair",
    instruction: "Hold the phone at eye level so people can recognise your face and hairstyle.",
    badgeText: "Step 1 of 3 · Face & Hair",
    targetZone: "upper",
  },
  {
    id: "outfit",
    startSecond: 3,
    endSecond: 6,
    title: "Tilt down to show your outfit",
    instruction: "Angle or lower your camera to show what you're wearing tonight.",
    badgeText: "Step 2 of 3 · Tonight's Outfit",
    targetZone: "lower",
  },
  {
    id: "return_face",
    startSecond: 6,
    endSecond: 8,
    title: "Back to your face",
    instruction: "Bring the camera back up — almost done.",
    badgeText: "Step 3 of 3 · Final Look",
    targetZone: "upper",
  },
];

export const QUICK_ICEBREAKERS: string[] = [
  "I'm near the bar — let's say hi",
  "Spotted your outfit in the crowd",
  "Let's meet by the main stage",
  "Come say hi before the next set",
];

export const DEMO_EVENTS: Record<string, EventDetails> = {
  NEON26: {
    id: "evt_neon_2026",
    code: "NEON26",
    name: "Neon Pulse Warehouse Rave",
    venue: "District 9 Warehouse, Victoria Island",
    city: "Lagos",
    category: "rave",
    startsAt: "2026-11-06T21:00:00Z",
    endsAt: "2026-11-07T06:00:00Z",
    isActive: true,
    activeParticipantCount: 84,
  },
  AFROFEST: {
    id: "evt_afrofest_2026",
    code: "AFROFEST",
    name: "Midnight Palms Music Festival",
    venue: "Landmark Beach Arena",
    city: "Lagos",
    category: "festival",
    startsAt: "2026-11-06T19:00:00Z",
    endsAt: "2026-11-07T05:00:00Z",
    isActive: true,
    activeParticipantCount: 142,
  },
  ROOFTOP: {
    id: "evt_rooftop_2026",
    code: "ROOFTOP",
    name: "Velvet Sky House Party",
    venue: "Skyline Terrace, Lekki Phase 1",
    city: "Lagos",
    category: "party",
    startsAt: "2026-11-06T22:00:00Z",
    endsAt: "2026-11-07T04:00:00Z",
    isActive: true,
    activeParticipantCount: 47,
  },
  PEEJAY01: {
    id: "evt_peejay01_2026",
    code: "PEEJAY01",
    name: "Uncle peejays brunch party",
    venue: "Tribe lagos",
    city: "Lagos",
    category: "gathering",
    startsAt: "2026-11-07T19:35:41.306Z",
    endsAt: "",
    isActive: true,
    activeParticipantCount: 24,
  },
};

export function getEventByCode(rawCode: string): EventDetails {
  const normalized = rawCode.trim().toUpperCase();
  if (DEMO_EVENTS[normalized]) {
    return DEMO_EVENTS[normalized];
  }

  return {
    id: `evt_custom_${normalized.toLowerCase()}`,
    code: normalized || "TONIGHT",
    name: `Room ${normalized || "TONIGHT"}`,
    venue: "Verified Event Venue",
    city: "Lagos",
    category: "rave",
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    isActive: true,
    activeParticipantCount: 32,
  };
}

/**
 * 8 Mock Attendees (Two 4-profile batches) ordered by proximity band:
 * 1. very_nearby -> 2. nearby -> 3. at_event
 */
export const DEMO_LOOK_VIDEO_1 =
  "https://opqdlnpznymkgwbkyfix.supabase.co/storage/v1/object/public/event-looks/DEMO/demo_1.mp4";
export const DEMO_LOOK_VIDEO_2 =
  "https://opqdlnpznymkgwbkyfix.supabase.co/storage/v1/object/public/event-looks/DEMO/demo_2.mp4";

export const MOCK_ATTENDEES: AttendeeProfile[] = [
  {
    id: "att_1",
    eventId: "evt_neon_2026",
    displayName: "Teni",
    lookSummary: "Braided updo · Burgundy leather crop & silver chains",
    videoUrl: DEMO_LOOK_VIDEO_1,
    recordedAt: "6m ago",
    proximityBand: "very_nearby",
    isDiscoverable: true,
  },
  {
    id: "att_2",
    eventId: "evt_neon_2026",
    displayName: "Kola",
    lookSummary: "Low fade & tinted frames · Vintage oversized black tee",
    videoUrl: DEMO_LOOK_VIDEO_2,
    recordedAt: "8m ago",
    proximityBand: "very_nearby",
    isDiscoverable: true,
  },
  {
    id: "att_3",
    eventId: "evt_neon_2026",
    displayName: "Zainab",
    lookSummary: "Curly shoulder-length hair · Off-shoulder white knit top",
    videoUrl: DEMO_LOOK_VIDEO_1,
    recordedAt: "14m ago",
    proximityBand: "nearby",
    isDiscoverable: true,
  },
  {
    id: "att_4",
    eventId: "evt_neon_2026",
    displayName: "Chidi",
    lookSummary: "Short locs · Unbuttoned silk patterned shirt",
    videoUrl: DEMO_LOOK_VIDEO_2,
    recordedAt: "19m ago",
    proximityBand: "nearby",
    isDiscoverable: true,
  },
  {
    id: "att_5",
    eventId: "evt_neon_2026",
    displayName: "Amara",
    lookSummary: "Sleek high ponytail · Metallic halter top & cargo pants",
    videoUrl: DEMO_LOOK_VIDEO_1,
    recordedAt: "22m ago",
    proximityBand: "very_nearby",
    isDiscoverable: true,
  },
  {
    id: "att_6",
    eventId: "evt_neon_2026",
    displayName: "Dami",
    lookSummary: "Buzz cut · Cream linen shirt & silver watch",
    videoUrl: DEMO_LOOK_VIDEO_2,
    recordedAt: "25m ago",
    proximityBand: "nearby",
    isDiscoverable: true,
  },
  {
    id: "att_7",
    eventId: "evt_neon_2026",
    displayName: "Sade",
    lookSummary: "Fulani braids · Deep red satin slip dress",
    videoUrl: DEMO_LOOK_VIDEO_1,
    recordedAt: "31m ago",
    proximityBand: "at_event",
    isDiscoverable: true,
  },
  {
    id: "att_8",
    eventId: "evt_neon_2026",
    displayName: "Tobi",
    lookSummary: "Twists · Black mesh sleeveless top & utility vest",
    videoUrl: DEMO_LOOK_VIDEO_2,
    recordedAt: "36m ago",
    proximityBand: "at_event",
    isDiscoverable: true,
  },
];

/**
 * Initial Identified Interests sent TO the current user (Section 3.9)
 * Allows immediate testing of the "Interested in You" inbox & Mutual Match flow.
 */
export const INITIAL_INCOMING_INTERESTS: AttendeeProfile[] = [
  {
    id: "inc_1",
    eventId: "evt_neon_2026",
    displayName: "Nia",
    lookSummary: "Long goddess braids · White corset top & denim jacket",
    videoUrl: DEMO_LOOK_VIDEO_1,
    recordedAt: "4m ago",
    proximityBand: "very_nearby",
    isDiscoverable: true,
  },
  {
    id: "inc_2",
    eventId: "evt_neon_2026",
    displayName: "Seyitan",
    lookSummary: "Taper fade · Dark burgundy crochet shirt",
    videoUrl: DEMO_LOOK_VIDEO_2,
    recordedAt: "11m ago",
    proximityBand: "nearby",
    isDiscoverable: true,
  },
];
