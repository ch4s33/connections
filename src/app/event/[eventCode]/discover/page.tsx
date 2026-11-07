"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Heart,
  Check,
  Camera,
  RefreshCw,
  X,
  MessageCircle,
  ShieldAlert,
  EyeOff,
  LogOut,
  Send,
  ArrowUpRight,
  Maximize2,
  SlidersHorizontal,
} from "lucide-react";
import {
  getEventByCode,
  MOCK_ATTENDEES,
  INITIAL_INCOMING_INTERESTS,
  QUICK_ICEBREAKERS,
} from "@/lib/mock-events";
import { AttendeeProfile, MutualMatch, ProximityBand } from "@/types/event";
import { supabase } from "@/lib/supabase";
import { playHaptic, playSound } from "@/lib/audio-haptics";

const PROXIMITY_LABELS: Record<ProximityBand, string> = {
  very_nearby: "Very Nearby",
  nearby: "Nearby",
  at_event: "In Room",
  unknown: "In Room",
};

type ActiveTab = "discover" | "interested" | "matches";

export default function EventDiscoverPage() {
  const params = useParams<{ eventCode: string }>();
  const router = useRouter();
  const rawCode = Array.isArray(params?.eventCode)
    ? params.eventCode[0]
    : params?.eventCode || "NEON26";

  const event = getEventByCode(decodeURIComponent(rawCode));

  const [deviceToken, setDeviceToken] = useState<string>("anonymous");
  const [myProfile, setMyProfile] = useState<{
    displayName: string;
    videoBlobUrl?: string;
    durationSeconds?: number;
  } | null>(null);

  // Navigation & Room State
  const [activeTab, setActiveTab] = useState<ActiveTab>("discover");
  const [batchIndex, setBatchIndex] = useState<number>(0);
  const [proximityEnabled, setProximityEnabled] = useState<boolean>(true);
  const [isDiscoveryPaused, setIsDiscoveryPaused] = useState<boolean>(false);
  const [showRoomMenu, setShowRoomMenu] = useState<boolean>(false);

  // Live Multi-User Social Discovery State
  const [attendees, setAttendees] = useState<AttendeeProfile[]>(MOCK_ATTENDEES);
  const [sentInterests, setSentInterests] = useState<Record<string, boolean>>(
    {}
  );
  const [incomingInterests, setIncomingInterests] = useState<AttendeeProfile[]>(
    INITIAL_INCOMING_INTERESTS
  );
  const [matches, setMatches] = useState<MutualMatch[]>([]);
  const [blockedIds, setBlockedIds] = useState<Record<string, boolean>>({});
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Modals: Full-Screen Look Modal, New Match Celebration Modal, Active Chat Modal
  const [expandedAttendee, setExpandedAttendee] =
    useState<AttendeeProfile | null>(null);
  const [expandedContext, setExpandedContext] = useState<
    "discover" | "incoming"
  >("discover");
  const [celebratingMatch, setCelebratingMatch] =
    useState<AttendeeProfile | null>(null);
  const [activeChatMatchId, setActiveChatMatchId] = useState<string | null>(
    null
  );
  const [chatDraft, setChatDraft] = useState<string>("");
  const [isRoomClosedByHost, setIsRoomClosedByHost] = useState<boolean>(false);
  const channelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

  const applyServerPayload = useCallback(
    (data: {
      attendees?: AttendeeProfile[];
      sentInterests?: Record<string, boolean>;
      incomingInterests?: AttendeeProfile[];
      matches?: MutualMatch[];
    }) => {
      if (data.attendees) setAttendees(data.attendees);
      if (data.sentInterests) setSentInterests(data.sentInterests);
      if (data.incomingInterests) setIncomingInterests(data.incomingInterests);
      if (data.matches) setMatches(data.matches);
    },
    []
  );

  const fetchRoomState = useCallback(
    async (token: string) => {
      try {
        const res = await fetch(
          `/api/events/${encodeURIComponent(
            event.code
          )}/state?deviceToken=${encodeURIComponent(token)}`
        );
        if (res.status === 410) {
          setIsRoomClosedByHost(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.isClosed) {
            setIsRoomClosedByHost(true);
            return;
          }
          applyServerPayload(data);
        }
      } catch {
        // Fallback to local state if offline
      }
    },
    [event.code, applyServerPayload]
  );

  useEffect(() => {
    let token = "anonymous";
    try {
      if (typeof window !== "undefined") {
        const savedToken = localStorage.getItem("linger_device_token");
        if (savedToken) {
          token = savedToken;
        } else {
          token = `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
          localStorage.setItem("linger_device_token", token);
        }
        setDeviceToken(token);

        const saved = sessionStorage.getItem(`linger_profile_${event.code}`);
        if (saved) {
          setMyProfile(JSON.parse(saved));
        }
      }
    } catch {
      // ignore
    }

    fetchRoomState(token);

    // Supabase Realtime WebSocket Connection (Section 3.10 & 3.11)
    const roomChannel = supabase
      .channel(`room_${event.code}`)
      .on("broadcast", { event: "new_chat_message" }, ({ payload }) => {
        if (payload?.matchId && payload.message) {
          setMatches((prev) =>
            prev.map((m) =>
              m.id === payload.matchId
                ? {
                    ...m,
                    messages: [
                      ...m.messages.filter(
                        (msg) => msg.id !== payload.message.id
                      ),
                      {
                        ...payload.message,
                        senderId:
                          payload.senderToken === token
                            ? "me"
                            : payload.message.senderId,
                      },
                    ],
                  }
                : m
            )
          );
          if (payload.senderToken !== token) {
            playHaptic("light");
            playSound("message_received");
          }
        }
      })
      .on("broadcast", { event: "new_interest" }, ({ payload }) => {
        if (payload?.recipientId) {
          fetchRoomState(token);
        }
      })
      .on("broadcast", { event: "mutual_match" }, () => {
        fetchRoomState(token);
      })
      .on("broadcast", { event: "room_closed" }, () => {
        setIsRoomClosedByHost(true);
      })
      .subscribe();

    channelRef.current = roomChannel;

    const interval = setInterval(() => {
      fetchRoomState(token);
    }, 5000);

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [event.code, fetchRoomState]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Filter out blocked attendees and paginate in 4-profile batches (Section 3.7)
  const visibleAttendees = useMemo(() => {
    return attendees.filter((a) => !blockedIds[a.id]);
  }, [attendees, blockedIds]);

  const totalBatches = Math.max(1, Math.ceil(visibleAttendees.length / 4));
  const currentBatchIndex = batchIndex % totalBatches;
  const currentFourProfiles = visibleAttendees.slice(
    currentBatchIndex * 4,
    currentBatchIndex * 4 + 4
  );

  const handleNextFour = () => {
    setBatchIndex((prev) => (prev + 1) % totalBatches);
  };

  const handleEnableProximity = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setProximityEnabled(true);
          showToast("Prioritising people closest to you right now.");
          try {
            const res = await fetch(
              `/api/events/${encodeURIComponent(event.code)}/state`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "upsert_profile",
                  deviceToken,
                  displayName: myProfile?.displayName || "Guest",
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                }),
              }
            );
            if (res.ok) {
              applyServerPayload(await res.json());
            }
          } catch {
            // ignore
          }
        },
        () => {
          setProximityEnabled(false);
          showToast("Location unavailable — showing everyone in the room.");
        }
      );
    } else {
      setProximityEnabled((prev) => !prev);
    }
  };

  // Express Identified Interest (Section 3.9)
  const handleSendInterest = async (attendee: AttendeeProfile) => {
    if (sentInterests[attendee.id]) return;

    playHaptic("medium");
    playSound("interest_sent");

    setSentInterests((prev) => ({
      ...prev,
      [attendee.id]: true,
    }));

    channelRef.current?.send({
      type: "broadcast",
      event: "new_interest",
      payload: {
        recipientId: attendee.id,
        senderToken: deviceToken,
      },
    });

    const existingIncoming = incomingInterests.find(
      (inc) => inc.id === attendee.id
    );
    if (existingIncoming) {
      await handleAcceptIncomingInterest(attendee);
      return;
    }

    showToast(
      `Interest sent to ${attendee.displayName}. They can now view your 8s look.`
    );

    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(event.code)}/state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_interest",
            deviceToken,
            displayName: myProfile?.displayName || "Guest",
            recipientProfileId: attendee.id,
          }),
        }
      );
      if (res.ok) {
        applyServerPayload(await res.json());
      }
    } catch {
      // ignore
    }
  };

  // Accept Incoming Identified Interest -> Creates Mutual Match (Section 3.10)
  const handleAcceptIncomingInterest = async (sender: AttendeeProfile) => {
    playHaptic("celebration");
    playSound("match_celebration");

    setIncomingInterests((prev) =>
      prev.filter((item) => item.id !== sender.id)
    );
    setSentInterests((prev) => ({ ...prev, [sender.id]: true }));
    setExpandedAttendee(null);
    setCelebratingMatch(sender);

    channelRef.current?.send({
      type: "broadcast",
      event: "mutual_match",
      payload: {
        tokenA: deviceToken,
        senderId: sender.id,
      },
    });

    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(event.code)}/state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "respond_interest",
            deviceToken,
            senderProfileId: sender.id,
            accept: true,
          }),
        }
      );
      if (res.ok) {
        applyServerPayload(await res.json());
      }
    } catch {
      // ignore
    }
  };

  // Private Decline (Section 3.9: "A decline should be private; sender receives no notification")
  const handleDeclineIncomingInterest = async (sender: AttendeeProfile) => {
    setIncomingInterests((prev) =>
      prev.filter((item) => item.id !== sender.id)
    );
    setExpandedAttendee(null);
    showToast(`Passed privately. ${sender.displayName} is not notified.`);

    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(event.code)}/state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "respond_interest",
            deviceToken,
            senderProfileId: sender.id,
            accept: false,
          }),
        }
      );
      if (res.ok) {
        applyServerPayload(await res.json());
      }
    } catch {
      // ignore
    }
  };

  // Block or Report Attendee (Section 7.3)
  const handleBlockAndReport = async (attendee: AttendeeProfile) => {
    setBlockedIds((prev) => ({ ...prev, [attendee.id]: true }));
    setIncomingInterests((prev) =>
      prev.filter((item) => item.id !== attendee.id)
    );
    setMatches((prev) => prev.filter((m) => m.attendee.id !== attendee.id));
    setExpandedAttendee(null);
    showToast(`${attendee.displayName} has been hidden and reported.`);

    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(event.code)}/state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "block_report",
            deviceToken,
            reportedProfileId: attendee.id,
          }),
        }
      );
      if (res.ok) {
        applyServerPayload(await res.json());
      }
    } catch {
      // ignore
    }
  };

  // Leave Event Room & Expire Profile (Section 6 & 7.3)
  const handleLeaveRoom = async () => {
    try {
      await fetch(`/api/events/${encodeURIComponent(event.code)}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "leave_room",
          deviceToken,
        }),
      });
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`linger_profile_${event.code}`);
      }
    } catch {
      // ignore
    }
    router.push("/");
  };

  // Send Message in Post-Match Private Chat (Section 3.11)
  const activeChatMatch =
    matches.find((m) => m.id === activeChatMatchId) || null;

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || !activeChatMatch) return;

    playHaptic("light");
    playSound("message_received");

    const optimisticMsg = {
      id: `msg_${Date.now()}`,
      matchId: activeChatMatch.id,
      senderId: "me" as const,
      text: trimmed,
      sentAt: "Just now",
    };

    setMatches((prev) =>
      prev.map((m) =>
        m.id === activeChatMatch.id
          ? { ...m, messages: [...m.messages, optimisticMsg] }
          : m
      )
    );
    setChatDraft("");

    channelRef.current?.send({
      type: "broadcast",
      event: "new_chat_message",
      payload: {
        matchId: activeChatMatch.id,
        senderToken: deviceToken,
        message: optimisticMsg,
      },
    });

    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(event.code)}/state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_message",
            deviceToken,
            matchId: activeChatMatch.id,
            text: trimmed,
          }),
        }
      );
      if (res.ok) {
        applyServerPayload(await res.json());
      }
    } catch {
      // ignore
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-between px-5 py-5 pb-safe relative">
      {/* Top Editorial Header */}
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-2xl text-white leading-none">
              linger.
            </span>
            <span className="text-[11px] font-mono text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
              {event.code}
            </span>
          </div>
          <p className="text-xs text-white/65 mt-1 truncate max-w-[230px]">
            {event.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/event/${encodeURIComponent(event.code)}/record`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 rounded-full transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Retake</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowRoomMenu((prev) => !prev)}
            title="Room & Privacy Controls"
            className="p-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Dropdown Room & Privacy Menu (Pause Discovery / Leave Room) */}
      {showRoomMenu && (
        <div className="mt-3 rounded-[24px] bg-white text-[#2b0712] p-4 shadow-2xl space-y-3 z-20">
          <div className="flex items-center justify-between border-b border-[#eadadd] pb-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy-700">
                Your Room Visibility
              </p>
              <p className="text-xs text-[#6e4753]">
                {myProfile?.displayName || "You"} ·{" "}
                {isDiscoveryPaused ? "Hidden from room" : "Visible in room"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRoomMenu(false)}
              className="p-1.5 rounded-full hover:bg-[#f7eff1] text-[#2b0712]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={async () => {
                const nextPaused = !isDiscoveryPaused;
                setIsDiscoveryPaused(nextPaused);
                setShowRoomMenu(false);
                showToast(
                  nextPaused
                    ? "Your profile is now paused and hidden."
                    : "Your profile is visible in the room again."
                );
                try {
                  await fetch(
                    `/api/events/${encodeURIComponent(event.code)}/state`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "toggle_pause",
                        deviceToken,
                        isDiscoverable: !nextPaused,
                      }),
                    }
                  );
                } catch {
                  // ignore
                }
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#f7eff1] hover:bg-[#efe2e5] text-[#2b0712] font-semibold py-3 px-3 transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>
                {isDiscoveryPaused ? "Resume Visibility" : "Pause Discovery"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLeaveRoom}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#541126] hover:bg-[#691630] text-white font-semibold py-3 px-3 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Room</span>
            </button>
          </div>
        </div>
      )}

      {/* Subtle Toast Banner */}
      {statusToast && (
        <div className="mt-3 rounded-2xl bg-white text-[#2b0712] px-4 py-2.5 text-xs font-semibold shadow-lg flex items-center justify-between">
          <span>{statusToast}</span>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-[#6e4753] hover:text-[#2b0712] ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs: Room (4-Grid) · Interested in You · Matches */}
      <nav className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-white/[0.07] border border-white/12 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("discover")}
          className={`rounded-xl py-2.5 px-2 text-xs font-semibold transition-all ${
            activeTab === "discover"
              ? "bg-white text-[#2b0712] shadow-sm"
              : "text-white/75 hover:text-white"
          }`}
        >
          In Room ({visibleAttendees.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("interested")}
          className={`rounded-xl py-2.5 px-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "interested"
              ? "bg-white text-[#2b0712] shadow-sm"
              : "text-white/75 hover:text-white"
          }`}
        >
          <span>Interested</span>
          {incomingInterests.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "interested"
                  ? "bg-[#541126] text-white"
                  : "bg-white text-[#2b0712]"
              }`}
            >
              {incomingInterests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("matches")}
          className={`rounded-xl py-2.5 px-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "matches"
              ? "bg-white text-[#2b0712] shadow-sm"
              : "text-white/75 hover:text-white"
          }`}
        >
          <span>Matches</span>
          {matches.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "matches"
                  ? "bg-[#541126] text-white"
                  : "bg-white text-[#2b0712]"
              }`}
            >
              {matches.length}
            </span>
          )}
        </button>
      </nav>

      {/* TAB 1: 4-Profile Nearby Discovery Grid */}
      {activeTab === "discover" && (
        <div className="flex-1 flex flex-col justify-between mt-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handleEnableProximity}
              className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
            >
              <MapPin className="w-3.5 h-3.5 text-white" />
              <span>
                {proximityEnabled
                  ? "Ranked by closest to you"
                  : "Showing all in room"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNextFour}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1 text-[11px] font-semibold text-white transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              <span>
                Next 4 ({currentBatchIndex + 1}/{totalBatches})
              </span>
            </button>
          </div>

          {/* 2x2 Grid of 4 Profiles (Section 3.7) */}
          <section className="grid grid-cols-2 gap-3.5 flex-1">
            {currentFourProfiles.map((attendee, index) => {
              const proxLabel = PROXIMITY_LABELS[attendee.proximityBand];
              const isInterested = !!sentInterests[attendee.id];
              const hasRealVideo =
                Boolean(attendee.videoUrl) &&
                attendee.videoUrl !== "simulated-selfie-video";

              return (
                <div
                  key={attendee.id}
                  onClick={() => {
                    setExpandedContext("discover");
                    setExpandedAttendee(attendee);
                  }}
                  className="cursor-pointer relative rounded-[26px] bg-gradient-to-b from-[#61152d] via-[#3a0a19] to-[#21040d] border border-white/15 hover:border-white/35 overflow-hidden flex flex-col justify-between aspect-[9/13] p-3.5 shadow-xl transition-all group"
                >
                  {/* Real Uploaded Selfie Video Loop or Editorial Monogram Backdrop */}
                  {hasRealVideo ? (
                    <>
                      <video
                        src={attendee.videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover z-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-[#1e040c]/90 z-0" />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none px-4 text-center">
                      <span className="font-serif italic text-5xl text-white/15 group-hover:scale-105 transition-transform">
                        0{currentBatchIndex * 4 + index + 1}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-white/35 mt-1">
                        Tap to expand 8s look
                      </span>
                    </div>
                  )}

                  {/* Top Proximity Badge & Expand Icon */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      {proxLabel}
                    </span>

                    <span className="h-6 w-6 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 group-hover:text-white">
                      <Maximize2 className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Bottom Name, Outfit Cue & Send Interest Button */}
                  <div
                    className="relative z-10 space-y-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      onClick={() => {
                        setExpandedContext("discover");
                        setExpandedAttendee(attendee);
                      }}
                    >
                      <h3 className="font-serif text-2xl text-white leading-none">
                        {attendee.displayName}
                      </h3>
                      <p className="text-[11px] text-white/75 line-clamp-1 mt-1">
                        {attendee.lookSummary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendInterest(attendee)}
                      className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-semibold transition-all ${
                        isInterested
                          ? "bg-white/15 border border-white/30 text-white"
                          : "bg-white text-[#2b0712] hover:bg-white/90 shadow-md"
                      }`}
                    >
                      {isInterested ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Interest Sent</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          <span>Send Interest</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          <footer className="text-center">
            <p className="text-[11px] text-white/55">
              Tap any card to inspect their face, hairstyle & tonight&apos;s
              outfit.
            </p>
          </footer>
        </div>
      )}

      {/* TAB 2: Identified Interest Inbox ("Interested in You" - Section 3.9) */}
      {activeTab === "interested" && (
        <div className="flex-1 flex flex-col justify-between mt-4 space-y-4">
          <div className="space-y-1 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
              Identified Interest
            </p>
            <h2 className="font-serif text-3xl text-white">
              People who noticed you tonight
            </h2>
            <p className="text-xs text-white/70">
              Watch their 8-second selfie video to see who they are in the
              crowd. Declining is always private.
            </p>
          </div>

          {incomingInterests.length === 0 ? (
            <div className="my-auto rounded-[28px] bg-white/[0.06] border border-white/12 p-8 text-center space-y-2">
              <p className="font-serif italic text-2xl text-white">
                No pending interests right now
              </p>
              <p className="text-xs text-white/65 max-w-[26ch] mx-auto leading-relaxed">
                When someone in {event.name} expresses interest in you, their
                8-second look will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3 my-auto">
              {incomingInterests.map((sender) => (
                <div
                  key={sender.id}
                  className="rounded-[26px] bg-white text-[#2b0712] p-5 shadow-xl space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7eff1] border border-[#eadadd] px-2.5 py-0.5 text-[10px] font-semibold text-burgundy-800 mb-1.5">
                        <MapPin className="w-3 h-3" />
                        {PROXIMITY_LABELS[sender.proximityBand]} ·{" "}
                        {sender.recordedAt}
                      </span>
                      <h3 className="font-serif text-3xl text-[#2b0712] leading-none">
                        {sender.displayName}
                      </h3>
                      <p className="text-xs text-[#6e4753] mt-1">
                        {sender.lookSummary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setExpandedContext("incoming");
                        setExpandedAttendee(sender);
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-2xl bg-[#f7eff1] hover:bg-[#efe2e5] border border-[#eadadd] px-3.5 py-2.5 text-xs font-semibold text-[#2b0712] transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Watch 8s Look</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDeclineIncomingInterest(sender)}
                      className="rounded-2xl bg-[#f7eff1] hover:bg-[#efe2e5] text-[#6e4753] font-semibold py-3.5 px-4 text-xs transition-colors"
                    >
                      Pass Privately
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAcceptIncomingInterest(sender)}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#541126] hover:bg-[#691630] text-white font-semibold py-3.5 px-4 text-xs shadow-md transition-all"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>Match Back</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <footer className="text-center">
            <p className="text-[11px] text-white/55">
              Passing is completely private — the sender never receives a
              rejection alert.
            </p>
          </footer>
        </div>
      )}

      {/* TAB 3: Mutual Matches & In-Person Connection Chat (Section 3.10 & 3.11) */}
      {activeTab === "matches" && (
        <div className="flex-1 flex flex-col justify-between mt-4 space-y-4">
          <div className="space-y-1 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
              Mutual Interest
            </p>
            <h2 className="font-serif text-3xl text-white">
              Say hello in person
            </h2>
            <p className="text-xs text-white/70">
              Both of you expressed interest. Send a quick note to find each
              other at {event.name}.
            </p>
          </div>

          {matches.length === 0 ? (
            <div className="my-auto rounded-[28px] bg-white/[0.06] border border-white/12 p-8 text-center space-y-3">
              <p className="font-serif italic text-2xl text-white">
                No mutual matches yet
              </p>
              <p className="text-xs text-white/65 max-w-[28ch] mx-auto leading-relaxed">
                Check your <strong>Interested</strong> tab or send interest to
                someone you noticed in the room.
              </p>
              {incomingInterests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("interested")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white text-[#2b0712] font-semibold py-3 px-5 text-xs shadow-md mt-2"
                >
                  <span>
                    View {incomingInterests.length} Interested in You
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 my-auto">
              {matches.map((match) => {
                const lastMsg = match.messages[match.messages.length - 1];
                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setActiveChatMatchId(match.id)}
                    className="w-full text-left rounded-[26px] bg-white text-[#2b0712] p-5 shadow-xl flex items-center justify-between gap-4 hover:bg-white/95 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-12 w-12 rounded-2xl bg-[#541126] text-white flex items-center justify-center font-serif italic text-xl shrink-0">
                        {match.attendee.displayName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-2xl text-[#2b0712] leading-none">
                            {match.attendee.displayName}
                          </h3>
                          <span className="text-[10px] font-semibold text-burgundy-700 bg-[#f7eff1] px-2 py-0.5 rounded-full">
                            {PROXIMITY_LABELS[match.attendee.proximityBand]}
                          </span>
                        </div>
                        <p className="text-xs text-[#6e4753] truncate mt-1">
                          {lastMsg
                            ? `${lastMsg.senderId === "me" ? "You: " : ""}${
                                lastMsg.text
                              }`
                            : match.attendee.lookSummary}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 h-10 w-10 rounded-2xl bg-[#f7eff1] flex items-center justify-center text-[#541126]">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <footer className="text-center">
            <p className="text-[11px] text-white/55">
              linger. is designed to help you meet tonight — not text all
              evening.
            </p>
          </footer>
        </div>
      )}

      {/* MODAL 1: Tap-to-Expand Full-Screen 8s Look Inspector */}
      {expandedAttendee && (
        <div className="fixed inset-0 z-50 bg-[#160308]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-[32px] bg-gradient-to-b from-[#541126] via-[#2b0712] to-[#1a030a] border border-white/20 overflow-hidden shadow-2xl flex flex-col justify-between aspect-[9/15] max-h-[86dvh] p-5 relative">
            {/* Full-bleed video playback when attendee has a recorded video */}
            {expandedAttendee.videoUrl &&
              expandedAttendee.videoUrl !== "simulated-selfie-video" && (
                <>
                  <video
                    src={expandedAttendee.videoUrl}
                    autoPlay
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#160308]/90 z-0" />
                </>
              )}

            {/* Top Bar inside Expanded Look Modal */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1 text-xs font-medium text-white">
                <MapPin className="w-3.5 h-3.5" />
                {PROXIMITY_LABELS[expandedAttendee.proximityBand]} ·{" "}
                {expandedAttendee.recordedAt}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBlockAndReport(expandedAttendee)}
                  title="Block or Report"
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/75 hover:text-white transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedAttendee(null)}
                  className="h-9 w-9 rounded-full bg-white text-[#2b0712] flex items-center justify-center shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Simulated 8s Selfie Video Playback Framing (if no live video file) */}
            {(!expandedAttendee.videoUrl ||
              expandedAttendee.videoUrl === "simulated-selfie-video") && (
              <div className="relative z-10 my-auto text-center px-4 space-y-3 select-none">
                <div className="mx-auto h-20 w-20 rounded-full border border-white/30 bg-white/5 flex items-center justify-center font-serif italic text-4xl text-white">
                  {expandedAttendee.displayName[0]}
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  8-Second Live Selfie Video Loop
                </p>
                <div className="rounded-2xl bg-white/[0.07] border border-white/15 p-3.5 max-w-xs mx-auto">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-1">
                    Tonight&apos;s Look (Face, Hair & Outfit)
                  </p>
                  <p className="text-xs text-white font-medium leading-relaxed">
                    {expandedAttendee.lookSummary}
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Action Area inside Expanded Modal */}
            <div className="relative z-10 rounded-[24px] bg-white text-[#2b0712] p-4 shadow-xl space-y-3">
              <div>
                <h3 className="font-serif text-3xl text-[#2b0712] leading-none">
                  {expandedAttendee.displayName}
                </h3>
                <p className="text-xs text-[#6e4753] mt-1">
                  {expandedContext === "incoming"
                    ? `${expandedAttendee.displayName} expressed interest in you`
                    : `In ${event.name} right now`}
                </p>
              </div>

              {expandedContext === "incoming" ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleDeclineIncomingInterest(expandedAttendee)
                    }
                    className="rounded-2xl bg-[#f7eff1] hover:bg-[#efe2e5] text-[#6e4753] font-semibold py-3.5 px-4 text-xs transition-colors"
                  >
                    Pass Privately
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAcceptIncomingInterest(expandedAttendee)
                    }
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#541126] hover:bg-[#691630] text-white font-semibold py-3.5 px-4 text-xs shadow-md transition-all"
                  >
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>Match Back</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleSendInterest(expandedAttendee);
                    setExpandedAttendee(null);
                  }}
                  disabled={!!sentInterests[expandedAttendee.id]}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 px-5 text-xs font-semibold transition-all ${
                    sentInterests[expandedAttendee.id]
                      ? "bg-[#f7eff1] text-[#6e4753]"
                      : "bg-[#541126] hover:bg-[#691630] text-white shadow-lg"
                  }`}
                >
                  {sentInterests[expandedAttendee.id] ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Interest Already Sent</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-current" />
                      <span>
                        Send Identified Interest to{" "}
                        {expandedAttendee.displayName}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Mutual Match Celebration Modal */}
      {celebratingMatch && (
        <div className="fixed inset-0 z-50 bg-[#160308]/90 backdrop-blur-md flex items-center justify-center p-5">
          <div className="w-full max-w-[380px] rounded-[32px] bg-white text-[#2b0712] p-6 shadow-2xl text-center space-y-5">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-burgundy-700 bg-[#f7eff1] px-3.5 py-1 rounded-full">
              Mutual Interest
            </span>

            <div className="space-y-2">
              <h2 className="font-serif text-4xl text-[#2b0712] leading-tight">
                You & {celebratingMatch.displayName}{" "}
                <span className="italic">matched.</span>
              </h2>
              <p className="text-xs text-[#6e4753] leading-relaxed">
                You are both at <strong>{event.name}</strong> right now. Send a
                quick note to say hi in person before the moment passes.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const found = matches.find(
                    (m) => m.attendee.id === celebratingMatch.id
                  );
                  setCelebratingMatch(null);
                  setActiveTab("matches");
                  if (found) {
                    setActiveChatMatchId(found.id);
                  }
                }}
                className="w-full flex items-center justify-between rounded-2xl bg-[#541126] hover:bg-[#691630] text-white font-semibold py-4 px-5 text-sm shadow-lg transition-all"
              >
                <span>Send a Quick Note</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setCelebratingMatch(null)}
                className="w-full rounded-2xl bg-[#f7eff1] hover:bg-[#efe2e5] text-[#6e4753] font-semibold py-3.5 px-4 text-xs transition-colors"
              >
                Keep Browsing Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Post-Match Private Chat with Real-World Icebreakers (Section 3.11) */}
      {activeChatMatch && (
        <div className="fixed inset-0 z-50 bg-[#160308]/95 backdrop-blur-md flex justify-center">
          <div className="w-full max-w-[430px] h-[100dvh] bg-gradient-to-b from-[#420c1d] via-[#2b0712] to-[#1e040c] flex flex-col justify-between p-5 pb-safe">
            {/* Chat Header */}
            <header className="flex items-center justify-between pb-4 border-b border-white/12">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveChatMatchId(null)}
                  className="h-9 w-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-2xl text-white leading-none">
                      {activeChatMatch.attendee.displayName}
                    </h3>
                    <span className="text-[10px] font-medium text-white/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/15">
                      {PROXIMITY_LABELS[activeChatMatch.attendee.proximityBand]}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-0.5 truncate max-w-[230px]">
                    {activeChatMatch.attendee.lookSummary}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveChatMatchId(null);
                  handleBlockAndReport(activeChatMatch.attendee);
                }}
                title="Block or Report"
                className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 no-scrollbar">
              <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 text-center">
                <p className="text-[11px] text-white/75">
                  Mutual match in <strong>{event.name}</strong>. Keep it brief
                  and meet up in person!
                </p>
              </div>

              {activeChatMatch.messages.map((msg) => {
                const isMe = msg.senderId === "me";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isMe
                          ? "bg-white text-[#2b0712] font-medium rounded-br-xs shadow-md"
                          : "bg-white/12 text-white border border-white/15 rounded-bl-xs"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-white/45 mt-1 px-1">
                      {msg.sentAt}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick In-Person Icebreaker Chips + Input Card */}
            <div className="space-y-2.5 pt-2 border-t border-white/12">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {QUICK_ICEBREAKERS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="shrink-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(chatDraft);
                }}
                className="flex items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-xl"
              >
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder={`Message ${activeChatMatch.attendee.displayName}...`}
                  className="flex-1 bg-transparent text-xs font-medium text-[#2b0712] placeholder:text-[#9c7a84] focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-9 w-9 rounded-xl bg-[#541126] hover:bg-[#691630] text-white flex items-center justify-center shrink-0 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Host Closed / Cancelled Room Modal */}
      {isRoomClosedByHost && (
        <div className="fixed inset-0 z-50 bg-[#160308]/95 backdrop-blur-md flex items-center justify-center p-5">
          <div className="w-full max-w-[360px] rounded-[32px] bg-white text-[#2b0712] p-6 text-center space-y-4 shadow-2xl">
            <div className="h-12 w-12 rounded-2xl bg-[#f7eff1] border border-[#eadadd] flex items-center justify-center text-[#541126] mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-burgundy-700">
                Room Closed & Ephemeral Data Purged
              </span>
              <h3 className="font-serif text-2xl text-[#2b0712]">
                Event has ended
              </h3>
              <p className="text-xs text-[#6e4753] leading-relaxed">
                The host has closed or cancelled this room. In accordance with
                our privacy policy, all attendee looks, locations, and chat
                histories have been permanently deleted from Supabase.
              </p>
            </div>

            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#541126] text-white font-semibold py-3.5 px-4 text-xs shadow-md transition-all"
            >
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
