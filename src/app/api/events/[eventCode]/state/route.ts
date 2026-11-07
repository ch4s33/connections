import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  AttendeeProfile,
  ChatMessage,
  ProximityBand,
} from "@/types/event";
import {
  MOCK_ATTENDEES,
  INITIAL_INCOMING_INTERESTS,
} from "@/lib/mock-events";
import { DATA_DIR, memoryStore } from "@/lib/server-store";

interface StoredProfile extends AttendeeProfile {
  deviceToken: string;
  lat?: number;
  lng?: number;
  updatedAtMs: number;
}

interface StoredInterest {
  id: string;
  senderProfileId: string;
  recipientProfileId: string;
  status: "pending" | "mutual_match" | "declined";
  createdAt: string;
}

interface StoredMatch {
  id: string;
  profileAId: string;
  profileBId: string;
  matchedAt: string;
  messages: ChatMessage[];
}

interface StoredBlock {
  reporterId: string;
  reportedId: string;
}

interface RoomStateData {
  eventCode: string;
  profiles: StoredProfile[];
  interests: StoredInterest[];
  matches: StoredMatch[];
  blocks: StoredBlock[];
}

function getRoomStateFile(eventCode: string): string {
  const clean = eventCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return path.join(DATA_DIR, `room_state_${clean || "DEFAULT"}.json`);
}

function computeProximityBand(
  lat1?: number,
  lng1?: number,
  lat2?: number,
  lng2?: number,
  fallback: ProximityBand = "very_nearby"
): ProximityBand {
  if (
    typeof lat1 !== "number" ||
    typeof lng1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lng2 !== "number"
  ) {
    return fallback;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = R * c;

  if (distanceMeters <= 35) return "very_nearby";
  if (distanceMeters <= 120) return "nearby";
  return "at_event";
}

function formatRelativeTime(timestampMs: number): string {
  const diffMin = Math.max(1, Math.round((Date.now() - timestampMs) / 60000));
  if (diffMin <= 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

async function readRoomState(eventCode: string): Promise<RoomStateData> {
  const cleanKey = eventCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || "DEFAULT";
  const filePath = getRoomStateFile(eventCode);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as RoomStateData;
    memoryStore.roomStates[cleanKey] = parsed;
    return parsed;
  } catch {
    if (memoryStore.roomStates[cleanKey]) {
      return memoryStore.roomStates[cleanKey] as RoomStateData;
    }
    const now = Date.now();
    const seededProfiles: StoredProfile[] = [
      ...MOCK_ATTENDEES.map((p, idx) => ({
        ...p,
        deviceToken: `seed_att_${idx}`,
        updatedAtMs: now - (idx + 3) * 180000,
      })),
      ...INITIAL_INCOMING_INTERESTS.map((p, idx) => ({
        ...p,
        deviceToken: `seed_inc_${idx}`,
        updatedAtMs: now - (idx + 1) * 120000,
      })),
    ];

    const initialState: RoomStateData = {
      eventCode,
      profiles: seededProfiles,
      interests: [],
      matches: [],
      blocks: [],
    };
    memoryStore.roomStates[cleanKey] = initialState;
    return initialState;
  }
}

async function writeRoomState(state: RoomStateData): Promise<void> {
  const cleanKey = state.eventCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || "DEFAULT";
  memoryStore.roomStates[cleanKey] = state;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      getRoomStateFile(state.eventCode),
      JSON.stringify(state, null, 2),
      "utf-8"
    );
  } catch {
    // Fallback to memoryStore.roomStates
  }
}

function buildClientPayload(state: RoomStateData, viewerDeviceToken: string) {
  const viewer = state.profiles.find(
    (p) => p.deviceToken === viewerDeviceToken
  );
  const viewerId = viewer?.id || `guest_${viewerDeviceToken}`;

  const isBlocked = (otherId: string) =>
    state.blocks.some(
      (b) =>
        (b.reporterId === viewerId && b.reportedId === otherId) ||
        (b.reporterId === otherId && b.reportedId === viewerId)
    );

  // Strip raw lat/lng before returning any profile to clients (Section 7.2)
  const sanitizeProfile = (p: StoredProfile): AttendeeProfile => ({
    id: p.id,
    eventId: p.eventId,
    displayName: p.displayName,
    lookSummary: p.lookSummary,
    videoUrl: p.videoUrl,
    recordedAt: p.deviceToken.startsWith("seed_")
      ? p.recordedAt
      : formatRelativeTime(p.updatedAtMs),
    proximityBand: computeProximityBand(
      viewer?.lat,
      viewer?.lng,
      p.lat,
      p.lng,
      p.proximityBand
    ),
    isDiscoverable: p.isDiscoverable,
  });

  // Sort real human profiles first, then by proximity band
  const bandRank: Record<ProximityBand, number> = {
    very_nearby: 0,
    nearby: 1,
    at_event: 2,
    unknown: 3,
  };

  const discoverableProfiles = state.profiles
    .filter(
      (p) =>
        p.deviceToken !== viewerDeviceToken &&
        p.isDiscoverable &&
        !p.deviceToken.startsWith("seed_inc_") &&
        !isBlocked(p.id)
    )
    .map((p) => ({
      raw: p,
      clean: sanitizeProfile(p),
    }))
    .sort((a, b) => {
      const aIsReal = !a.raw.deviceToken.startsWith("seed_") ? 0 : 1;
      const bIsReal = !b.raw.deviceToken.startsWith("seed_") ? 0 : 1;
      if (aIsReal !== bIsReal) return aIsReal - bIsReal;
      return (
        bandRank[a.clean.proximityBand] - bandRank[b.clean.proximityBand]
      );
    })
    .map((item) => item.clean);

  // Sent interests by viewer
  const sentInterestsMap: Record<string, boolean> = {};
  for (const intr of state.interests) {
    if (intr.senderProfileId === viewerId) {
      sentInterestsMap[intr.recipientProfileId] = true;
    }
  }

  // Incoming pending interests sent to viewer
  const incomingProfiles: AttendeeProfile[] = [];
  for (const intr of state.interests) {
    if (
      intr.recipientProfileId === viewerId &&
      intr.status === "pending" &&
      !isBlocked(intr.senderProfileId)
    ) {
      const sender = state.profiles.find((p) => p.id === intr.senderProfileId);
      if (sender) {
        incomingProfiles.push(sanitizeProfile(sender));
      }
    }
  }

  // Mutual matches involving viewer
  const clientMatches = state.matches
    .filter(
      (m) =>
        (m.profileAId === viewerId || m.profileBId === viewerId) &&
        !isBlocked(m.profileAId === viewerId ? m.profileBId : m.profileAId)
    )
    .map((m) => {
      const otherId = m.profileAId === viewerId ? m.profileBId : m.profileAId;
      const otherProfile = state.profiles.find((p) => p.id === otherId);
      if (!otherProfile) return null;
      return {
        id: m.id,
        attendee: sanitizeProfile(otherProfile),
        matchedAt: m.matchedAt,
        messages: m.messages.map((msg) => ({
          ...msg,
          senderId: msg.senderId === viewerId ? "me" : msg.senderId,
        })),
      };
    })
    .filter(Boolean);

  return {
    myProfile: viewer ? sanitizeProfile(viewer) : null,
    attendees: discoverableProfiles,
    sentInterests: sentInterestsMap,
    incomingInterests: incomingProfiles,
    matches: clientMatches,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventCode: string }> }
) {
  const { eventCode } = await context.params;
  const deviceToken =
    request.nextUrl.searchParams.get("deviceToken") || "anonymous";
  const state = await readRoomState(eventCode);

  return NextResponse.json(buildClientPayload(state, deviceToken));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventCode: string }> }
) {
  const { eventCode } = await context.params;
  const body = await request.json();
  const action = body.action as string;
  const deviceToken = (body.deviceToken as string) || "anonymous";

  const state = await readRoomState(eventCode);
  let viewer = state.profiles.find((p) => p.deviceToken === deviceToken);

  if (action === "upsert_profile") {
    const displayName = (body.displayName || "Guest").trim();
    const lookSummary = (
      body.lookSummary || "Live 8s selfie look · Face, hair & outfit verified"
    ).trim();
    const videoUrl = body.videoUrl || "";

    if (!viewer) {
      viewer = {
        id: `usr_${deviceToken.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`,
        eventId: `evt_${eventCode.toLowerCase()}`,
        deviceToken,
        displayName,
        lookSummary,
        videoUrl,
        recordedAt: "Just now",
        proximityBand: "very_nearby",
        isDiscoverable: true,
        lat: typeof body.lat === "number" ? body.lat : undefined,
        lng: typeof body.lng === "number" ? body.lng : undefined,
        updatedAtMs: Date.now(),
      };
      state.profiles.unshift(viewer);

      // Seed the 2 demo incoming interests for this new user so they can also test incoming inbox right away
      for (const inc of INITIAL_INCOMING_INTERESTS) {
        const alreadyExists = state.interests.some(
          (i) =>
            i.senderProfileId === inc.id && i.recipientProfileId === viewer!.id
        );
        if (!alreadyExists) {
          state.interests.push({
            id: `intr_seed_${inc.id}_${viewer.id}`,
            senderProfileId: inc.id,
            recipientProfileId: viewer.id,
            status: "pending",
            createdAt: "Just now",
          });
        }
      }
    } else {
      viewer.displayName = displayName || viewer.displayName;
      if (body.lookSummary) viewer.lookSummary = lookSummary;
      if (body.videoUrl) viewer.videoUrl = videoUrl;
      if (typeof body.lat === "number") viewer.lat = body.lat;
      if (typeof body.lng === "number") viewer.lng = body.lng;
      viewer.isDiscoverable = true;
      viewer.updatedAtMs = Date.now();
    }

    await writeRoomState(state);
    return NextResponse.json(buildClientPayload(state, deviceToken));
  }

  // Ensure viewer exists for social actions
  if (!viewer) {
    viewer = {
      id: `usr_${deviceToken.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`,
      eventId: `evt_${eventCode.toLowerCase()}`,
      deviceToken,
      displayName: body.displayName || "Guest",
      lookSummary: "Live 8s selfie look · Face, hair & outfit verified",
      videoUrl: "",
      recordedAt: "Just now",
      proximityBand: "very_nearby",
      isDiscoverable: true,
      updatedAtMs: Date.now(),
    };
    state.profiles.unshift(viewer);
  }

  if (action === "send_interest") {
    const recipientId = body.recipientProfileId as string;
    if (recipientId && recipientId !== viewer.id) {
      // Check if recipient already sent interest to viewer
      const reverseInterest = state.interests.find(
        (i) =>
          i.senderProfileId === recipientId &&
          i.recipientProfileId === viewer!.id &&
          i.status === "pending"
      );

      if (reverseInterest) {
        reverseInterest.status = "mutual_match";
        const matchId = `match_${Date.now()}`;
        state.matches.unshift({
          id: matchId,
          profileAId: viewer.id,
          profileBId: recipientId,
          matchedAt: "Just now",
          messages: [
            {
              id: `msg_${Date.now()}`,
              matchId,
              senderId: recipientId,
              text: "Hey! Spotted your look in the room — where are you standing?",
              sentAt: "Just now",
            },
          ],
        });
      } else {
        const existing = state.interests.find(
          (i) =>
            i.senderProfileId === viewer!.id &&
            i.recipientProfileId === recipientId
        );
        if (!existing) {
          state.interests.push({
            id: `intr_${Date.now()}`,
            senderProfileId: viewer.id,
            recipientProfileId: recipientId,
            status: "pending",
            createdAt: "Just now",
          });
        }
      }
    }
  } else if (action === "respond_interest") {
    const senderId = body.senderProfileId as string;
    const accept = Boolean(body.accept);

    const incoming = state.interests.find(
      (i) =>
        i.senderProfileId === senderId &&
        i.recipientProfileId === viewer!.id &&
        i.status === "pending"
    );

    if (incoming) {
      if (accept) {
        incoming.status = "mutual_match";
        const matchId = `match_${Date.now()}`;
        state.matches.unshift({
          id: matchId,
          profileAId: senderId,
          profileBId: viewer.id,
          matchedAt: "Just now",
          messages: [
            {
              id: `msg_${Date.now()}`,
              matchId,
              senderId: senderId,
              text: "Hey! Spotted your look in the room — where are you standing?",
              sentAt: "Just now",
            },
          ],
        });
      } else {
        // Private decline: sender receives no notification
        incoming.status = "declined";
      }
    }
  } else if (action === "send_message") {
    const matchId = body.matchId as string;
    const text = ((body.text as string) || "").trim();
    const match = state.matches.find((m) => m.id === matchId);
    if (match && text) {
      match.messages.push({
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        matchId,
        senderId: viewer.id,
        text,
        sentAt: "Just now",
      });
    }
  } else if (action === "toggle_pause") {
    viewer.isDiscoverable = Boolean(body.isDiscoverable);
  } else if (action === "leave_room") {
    state.profiles = state.profiles.filter(
      (p) => p.deviceToken !== deviceToken
    );
  } else if (action === "block_report") {
    const reportedId = body.reportedProfileId as string;
    if (reportedId) {
      state.blocks.push({
        reporterId: viewer.id,
        reportedId,
      });
    }
  }

  await writeRoomState(state);
  return NextResponse.json(buildClientPayload(state, deviceToken));
}
