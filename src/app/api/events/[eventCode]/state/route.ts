import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  AttendeeProfile,
  ChatMessage,
  MutualMatch,
  ProximityBand,
} from "@/types/event";
import {
  MOCK_ATTENDEES,
  INITIAL_INCOMING_INTERESTS,
} from "@/lib/mock-events";
import { DATA_DIR, memoryStore } from "@/lib/server-store";
import { supabaseAdmin } from "@/lib/supabase";

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
  isClosed?: boolean;
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

/**
 * Ensure the event exists in Supabase events table.
 * If not, insert a default event row.
 */
async function getOrEnsureEventInSupabase(cleanCode: string) {
  try {
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("events")
      .select("id, code, is_active, name, venue")
      .ilike("code", cleanCode)
      .maybeSingle();

    if (!selErr && existing) {
      return existing;
    }

    // Auto-create room record in Supabase
    const { data: created } = await supabaseAdmin
      .from("events")
      .insert({
        code: cleanCode,
        name: `Room ${cleanCode}`,
        venue: "Verified In-Person Venue",
        city: "Lagos",
        category: "rave",
        is_active: true,
      })
      .select()
      .single();

    return created || null;
  } catch {
    return null;
  }
}

/**
 * Read room state from Supabase first, falling back to local file/memory store.
 * If host closed/cancelled the event, returns isClosed = true and empty data.
 */
async function readRoomState(eventCode: string): Promise<RoomStateData> {
  const cleanKey =
    eventCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || "DEFAULT";

  // 1. Try reading from Supabase
  try {
    const eventRow = await getOrEnsureEventInSupabase(cleanKey);

    if (eventRow && !eventRow.is_active) {
      // Room was closed/cancelled by host: return empty state
      const emptyState: RoomStateData = {
        eventCode,
        isClosed: true,
        profiles: [],
        interests: [],
        matches: [],
        blocks: [],
      };
      memoryStore.roomStates[cleanKey] = emptyState;
      return emptyState;
    }

    if (eventRow && eventRow.id) {
      // Fetch profiles
      const { data: dbProfiles } = await supabaseAdmin
        .from("attendee_profiles")
        .select("*")
        .eq("event_id", eventRow.id);

      // If no profiles in Supabase yet, seed initial mock attendees into Supabase
      if (!Array.isArray(dbProfiles) || dbProfiles.length === 0) {
        const seedPayload = [
          ...MOCK_ATTENDEES.map((p, idx) => ({
            event_id: eventRow.id,
            device_token: `seed_att_${idx}`,
            display_name: p.displayName,
            look_summary: p.lookSummary,
            video_url: p.videoUrl,
            is_discoverable: true,
          })),
          ...INITIAL_INCOMING_INTERESTS.map((p, idx) => ({
            event_id: eventRow.id,
            device_token: `seed_inc_${idx}`,
            display_name: p.displayName,
            look_summary: p.lookSummary,
            video_url: p.videoUrl,
            is_discoverable: true,
          })),
        ];

        await supabaseAdmin.from("attendee_profiles").insert(seedPayload);
      }

      // Re-read attendees from Supabase
      const { data: allDbProfiles } = await supabaseAdmin
        .from("attendee_profiles")
        .select("*")
        .eq("event_id", eventRow.id);

      // Fetch locations
      const { data: dbLocations } = await supabaseAdmin
        .from("attendee_locations")
        .select("*");

      const locationMap: Record<string, { lat: number; lng: number }> = {};
      if (Array.isArray(dbLocations)) {
        for (const loc of dbLocations) {
          locationMap[loc.profile_id] = { lat: loc.lat, lng: loc.lng };
        }
      }

      // Fetch interests
      const { data: dbInterests } = await supabaseAdmin
        .from("expressed_interests")
        .select("*")
        .eq("event_id", eventRow.id);

      // Fetch matches
      const { data: dbMatches } = await supabaseAdmin
        .from("mutual_matches")
        .select("*")
        .eq("event_id", eventRow.id);

      // Fetch messages for matches
      const matchIds = (dbMatches || []).map((m) => m.id);
      let dbMessages: Array<{
        id: string;
        match_id: string;
        sender_profile_id: string;
        body: string;
        created_at: string;
      }> = [];

      if (matchIds.length > 0) {
        const { data: msgs } = await supabaseAdmin
          .from("chat_messages")
          .select("*")
          .in("match_id", matchIds)
          .order("created_at", { ascending: true });
        if (Array.isArray(msgs)) dbMessages = msgs;
      }

      // Fetch blocks
      const { data: dbBlocks } = await supabaseAdmin
        .from("blocks_reports")
        .select("*")
        .eq("event_id", eventRow.id);

      if (Array.isArray(allDbProfiles) && allDbProfiles.length > 0) {
        const mappedProfiles: StoredProfile[] = allDbProfiles.map((p) => {
          const loc = locationMap[p.id];
          return {
            id: p.id,
            eventId: eventRow.id,
            deviceToken: p.device_token,
            displayName: p.display_name,
            lookSummary: p.look_summary,
            videoUrl: p.video_url,
            recordedAt: "Just now",
            proximityBand: "very_nearby",
            isDiscoverable: Boolean(p.is_discoverable),
            lat: loc?.lat,
            lng: loc?.lng,
            updatedAtMs: new Date(p.updated_at).getTime(),
          };
        });

        const mappedInterests: StoredInterest[] = (dbInterests || []).map(
          (i) => ({
            id: i.id,
            senderProfileId: i.sender_profile_id,
            recipientProfileId: i.recipient_profile_id,
            status: i.status,
            createdAt: i.created_at,
          })
        );

        const mappedMatches: StoredMatch[] = (dbMatches || []).map((m) => {
          const matchMsgs = dbMessages
            .filter((msg) => msg.match_id === m.id)
            .map((msg) => ({
              id: msg.id,
              matchId: m.id,
              senderId: msg.sender_profile_id,
              text: msg.body,
              sentAt: "Just now",
            }));

          return {
            id: m.id,
            profileAId: m.profile_a_id,
            profileBId: m.profile_b_id,
            matchedAt: "Just now",
            messages: matchMsgs,
          };
        });

        const mappedBlocks: StoredBlock[] = (dbBlocks || []).map((b) => ({
          reporterId: b.reporter_profile_id,
          reportedId: b.reported_profile_id,
        }));

        const dbState: RoomStateData = {
          eventCode,
          isClosed: false,
          profiles: mappedProfiles,
          interests: mappedInterests,
          matches: mappedMatches,
          blocks: mappedBlocks,
        };

        memoryStore.roomStates[cleanKey] = dbState;
        return dbState;
      }
    }
  } catch {
    // Fallback if Supabase network is unavailable
  }

  // 2. Fallback to local files & memory store
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
      isClosed: false,
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
  const cleanKey =
    state.eventCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || "DEFAULT";
  memoryStore.roomStates[cleanKey] = state;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      getRoomStateFile(state.eventCode),
      JSON.stringify(state, null, 2),
      "utf-8"
    );
  } catch {
    // Fallback to memoryStore
  }
}

function buildClientPayload(state: RoomStateData, viewerDeviceToken: string) {
  if (state.isClosed) {
    return {
      isClosed: true,
      myProfile: null,
      attendees: [],
      sentInterests: {},
      incomingInterests: [],
      matches: [],
    };
  }

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
  const clientMatches: MutualMatch[] = state.matches
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
    .filter((m): m is MutualMatch => Boolean(m));

  return {
    isClosed: false,
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
  const cleanCode =
    eventCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || "DEFAULT";
  const body = await request.json();
  const action = body.action as string;
  const deviceToken = (body.deviceToken as string) || "anonymous";

  const eventRow = await getOrEnsureEventInSupabase(cleanCode);
  const state = await readRoomState(eventCode);

  if (state.isClosed) {
    return NextResponse.json(
      {
        isClosed: true,
        message: "This event room was closed or cancelled by the organiser.",
      },
      { status: 410 }
    );
  }

  let viewer = state.profiles.find((p) => p.deviceToken === deviceToken);

  if (action === "upsert_profile") {
    const displayName = (body.displayName || "Guest").trim();
    const lookSummary = (
      body.lookSummary || "Live 8s selfie look · Face, hair & outfit verified"
    ).trim();
    const videoUrl =
      body.videoUrl ||
      "https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-neon-lighting-39877-large.mp4";

    // 1. Sync to Supabase attendee_profiles
    let dbViewerId: string | undefined;
    if (eventRow?.id) {
      try {
        const { data: dbProf } = await supabaseAdmin
          .from("attendee_profiles")
          .upsert(
            {
              event_id: eventRow.id,
              device_token: deviceToken,
              display_name: displayName,
              look_summary: lookSummary,
              video_url: videoUrl,
              is_discoverable: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "event_id, device_token" }
          )
          .select()
          .single();

        if (dbProf?.id) {
          dbViewerId = dbProf.id;

          // If GPS lat/lng provided, upsert into attendee_locations
          if (
            typeof body.lat === "number" &&
            typeof body.lng === "number"
          ) {
            await supabaseAdmin.from("attendee_locations").upsert(
              {
                profile_id: dbProf.id,
                lat: body.lat,
                lng: body.lng,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "profile_id" }
            );
          }

          // Ensure incoming demo interests exist in Supabase for this attendee
          const seedIncoming = state.profiles.filter((p) =>
            p.deviceToken.startsWith("seed_inc_")
          );
          for (const inc of seedIncoming) {
            await supabaseAdmin.from("expressed_interests").upsert(
              {
                event_id: eventRow.id,
                sender_profile_id: inc.id,
                recipient_profile_id: dbProf.id,
                status: "pending",
              },
              {
                onConflict:
                  "event_id, sender_profile_id, recipient_profile_id",
              }
            );
          }
        }
      } catch {
        // Fallback to local
      }
    }

    if (!viewer) {
      viewer = {
        id:
          dbViewerId ||
          `usr_${deviceToken.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`,
        eventId: eventRow?.id || `evt_${eventCode.toLowerCase()}`,
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

      // Seed local incoming interests for immediate inbox display
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
      if (dbViewerId) viewer.id = dbViewerId;
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
      eventId: eventRow?.id || `evt_${eventCode.toLowerCase()}`,
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

        // Supabase sync for match & message
        if (eventRow?.id) {
          try {
            await supabaseAdmin
              .from("expressed_interests")
              .update({ status: "mutual_match" })
              .eq("id", reverseInterest.id);

            const { data: dbMatch } = await supabaseAdmin
              .from("mutual_matches")
              .insert({
                event_id: eventRow.id,
                profile_a_id: viewer.id,
                profile_b_id: recipientId,
              })
              .select()
              .single();

            if (dbMatch?.id) {
              await supabaseAdmin.from("chat_messages").insert({
                match_id: dbMatch.id,
                sender_profile_id: recipientId,
                body: "Hey! Spotted your look in the room — where are you standing?",
              });
            }
          } catch {
            // ignore
          }
        }
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

          if (eventRow?.id) {
            try {
              await supabaseAdmin.from("expressed_interests").insert({
                event_id: eventRow.id,
                sender_profile_id: viewer.id,
                recipient_profile_id: recipientId,
                status: "pending",
              });
            } catch {
              // ignore
            }
          }
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

        if (eventRow?.id) {
          try {
            await supabaseAdmin
              .from("expressed_interests")
              .update({ status: "mutual_match" })
              .eq("id", incoming.id);

            const { data: dbMatch } = await supabaseAdmin
              .from("mutual_matches")
              .insert({
                event_id: eventRow.id,
                profile_a_id: senderId,
                profile_b_id: viewer.id,
              })
              .select()
              .single();

            if (dbMatch?.id) {
              await supabaseAdmin.from("chat_messages").insert({
                match_id: dbMatch.id,
                sender_profile_id: senderId,
                body: "Hey! Spotted your look in the room — where are you standing?",
              });
            }
          } catch {
            // ignore
          }
        }
      } else {
        // Private decline: sender receives no notification
        incoming.status = "declined";
        if (eventRow?.id) {
          try {
            await supabaseAdmin
              .from("expressed_interests")
              .update({ status: "declined" })
              .eq("id", incoming.id);
          } catch {
            // ignore
          }
        }
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

      if (eventRow?.id) {
        try {
          await supabaseAdmin.from("chat_messages").insert({
            match_id: matchId,
            sender_profile_id: viewer.id,
            body: text,
          });
        } catch {
          // ignore
        }
      }
    }
  } else if (action === "toggle_pause") {
    viewer.isDiscoverable = Boolean(body.isDiscoverable);
    if (eventRow?.id) {
      try {
        await supabaseAdmin
          .from("attendee_profiles")
          .update({ is_discoverable: viewer.isDiscoverable })
          .eq("id", viewer.id);
      } catch {
        // ignore
      }
    }
  } else if (action === "leave_room") {
    // Strict privacy: leaving the room deletes attendee profile & cascades
    state.profiles = state.profiles.filter(
      (p) => p.deviceToken !== deviceToken
    );
    if (eventRow?.id) {
      try {
        await supabaseAdmin
          .from("attendee_profiles")
          .delete()
          .eq("event_id", eventRow.id)
          .eq("device_token", deviceToken);
      } catch {
        // ignore
      }
    }
  } else if (action === "block_report") {
    const reportedId = body.reportedProfileId as string;
    if (reportedId) {
      state.blocks.push({
        reporterId: viewer.id,
        reportedId,
      });

      if (eventRow?.id) {
        try {
          await supabaseAdmin.from("blocks_reports").insert({
            event_id: eventRow.id,
            reporter_profile_id: viewer.id,
            reported_profile_id: reportedId,
            reason: (body.reason as string) || "Reported in room",
          });
        } catch {
          // ignore
        }
      }
    }
  }

  await writeRoomState(state);
  return NextResponse.json(buildClientPayload(state, deviceToken));
}
