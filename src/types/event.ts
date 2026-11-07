/**
 * Core Domain Types based on Product Requirements (Sections 3, 4, 6, 7)
 */

export type EventCategory = "rave" | "festival" | "party" | "gathering";

export interface EventDetails {
  id: string;
  code: string; // Short code embedded in QR URL e.g. /event/NEON26
  name: string;
  venue: string;
  city: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  activeParticipantCount: number;
}

/**
 * Approximate proximity bands (Section 3.8 & 7.2)
 * Never expose exact GPS coordinates or exact indoor distances to other users.
 */
export type ProximityBand = "very_nearby" | "nearby" | "at_event" | "unknown";

export interface AttendeeProfile {
  id: string;
  eventId: string;
  displayName: string;
  lookSummary: string; // Hair & outfit visual cue shown on expanded look view
  videoUrl: string;
  recordedAt: string;
  proximityBand: ProximityBand;
  isDiscoverable: boolean;
}

/**
 * Identified interest (Section 3.9 & 3.10)
 * Recipients see who expressed interest and can view their selfie video before reciprocating.
 */
export type InterestStatus = "pending" | "mutual_match" | "declined";

export interface ExpressedInterest {
  id: string;
  eventId: string;
  senderProfile: AttendeeProfile;
  recipientProfileId: string;
  status: InterestStatus;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: "me" | string;
  text: string;
  sentAt: string;
}

export interface MutualMatch {
  id: string;
  attendee: AttendeeProfile;
  matchedAt: string;
  messages: ChatMessage[];
}

/**
 * Camera Recording Guidance Steps (Section 3.5 & User Specification)
 * 8-second max recording with 3-second minimum:
 * - 0-3s: Face & hairstyle
 * - 3-6s: Tilt/angle down to show outfit
 * - 6-8s: Back to face
 */
export interface RecordingStepPrompt {
  id: "face_hair" | "outfit" | "return_face";
  startSecond: number;
  endSecond: number;
  title: string;
  instruction: string;
  badgeText: string;
  targetZone: "upper" | "lower" | "full";
}
