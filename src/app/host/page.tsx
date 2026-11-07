"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Check,
  Printer,
  QrCode,
  Power,
  Plus,
  Sparkles,
  X,
  BarChart3,
  Trash2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { DEMO_EVENTS } from "@/lib/mock-events";
import { EventCategory, EventDetails } from "@/types/event";
import { generateQrMatrix } from "@/lib/qr-code";
import { supabase } from "@/lib/supabase";

interface RoomPilotMetrics {
  code: string;
  activeParticipants: number;
  videosRecorded: number;
  interestsSent: number;
  mutualMatches: number;
  chatsStarted: number;
}

export default function HostDashboardPage() {
  const [rooms, setRooms] = useState<EventDetails[]>(
    Object.values(DEMO_EVENTS)
  );
  const [metrics, setMetrics] = useState<Record<string, RoomPilotMetrics>>({});
  const [activeTab, setActiveTab] = useState<"manage" | "create" | "metrics">(
    "manage"
  );
  const [selectedPosterRoom, setSelectedPosterRoom] =
    useState<EventDetails | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("http://localhost:3000");

  // Room Cancellation & Ephemeral Purge State
  const [roomToCancel, setRoomToCancel] = useState<EventDetails | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Create Room Form State
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Lagos");
  const [category, setCategory] = useState<EventCategory>("rave");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadRoomsAndMetrics = () => {
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => {
        if (data.rooms) setRooms(data.rooms);
        if (data.metrics) setMetrics(data.metrics);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
    loadRoomsAndMetrics();
  }, []);

  const handleGenerateRandomCode = () => {
    const prefix =
      name
        .trim()
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 4)
        .toUpperCase() || "ROOM";
    const num = Math.floor(10 + Math.random() * 89);
    setCode(`${prefix}${num}`);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!name.trim() || !venue.trim() || !cleanCode) {
      setFormError("Please enter the event name, venue, and a room code.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          venue: venue.trim(),
          city: city.trim() || "Lagos",
          category,
          code: cleanCode,
        }),
      });
      const data = await res.json();
      if (data.room) {
        setRooms((prev) => [
          data.room,
          ...prev.filter((r) => r.code !== data.room.code),
        ]);
        setSelectedPosterRoom(data.room);
        setActiveTab("manage");
        setName("");
        setVenue("");
        setCode("");
        loadRoomsAndMetrics();
      } else {
        setFormError(data.error || "Could not create room.");
      }
    } catch {
      setFormError("Network error while creating room.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRoomStatus = async (room: EventDetails) => {
    const nextActive = !room.isActive;
    setRooms((prev) =>
      prev.map((r) =>
        r.code === room.code ? { ...r, isActive: nextActive } : r
      )
    );
    if (selectedPosterRoom?.code === room.code) {
      setSelectedPosterRoom({ ...room, isActive: nextActive });
    }

    try {
      if (!nextActive) {
        supabase
          .channel(`room_${room.code}`)
          .send({ type: "broadcast", event: "room_closed", payload: { code: room.code } })
          .catch(() => {});
      }
      await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: room.code, isActive: nextActive }),
      });
    } catch {
      // ignore
    }
  };

  const handleConfirmCancelRoom = async () => {
    if (!roomToCancel) return;
    setIsCancelling(true);
    const targetCode = roomToCancel.code;

    try {
      supabase
        .channel(`room_${targetCode}`)
        .send({ type: "broadcast", event: "room_closed", payload: { code: targetCode } })
        .catch(() => {});

      const res = await fetch(
        `/api/rooms?code=${encodeURIComponent(targetCode)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      setRooms((prev) => prev.filter((r) => r.code !== targetCode));
      if (selectedPosterRoom?.code === targetCode) {
        setSelectedPosterRoom(null);
      }
      setRoomToCancel(null);
      setCancelNotice(
        `Event ${targetCode} cancelled. All attendee selfie looks, locations, and chat records were permanently purged from Supabase (${data.purgedCount || 0} profiles deleted).`
      );
      setTimeout(() => setCancelNotice(null), 6000);
    } catch {
      setCancelNotice(`Network error while cancelling room ${targetCode}.`);
      setTimeout(() => setCancelNotice(null), 4000);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCopyRoomLink = (roomCode: string) => {
    const url = `${origin}/event/${encodeURIComponent(roomCode)}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedCode(roomCode);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === roomCode ? null : prev));
    }, 2500);
  };

  const qrMatrix = useMemo(() => {
    if (!selectedPosterRoom) return [];
    const targetUrl = `${origin}/event/${encodeURIComponent(
      selectedPosterRoom.code
    )}`;
    return generateQrMatrix(targetUrl);
  }, [selectedPosterRoom, origin]);

  return (
    <main className="flex-1 flex flex-col justify-between px-6 py-7 pb-safe">
      {/* Top Bar */}
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white transition-colors py-2 px-3.5 rounded-full bg-white/10 border border-white/15"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Guest View</span>
        </Link>

        <div className="flex items-baseline gap-1.5">
          <span className="font-serif italic text-2xl text-white">linger.</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            Host
          </span>
        </div>
      </header>

      {/* Ephemeral Purge Notice Banner */}
      {cancelNotice && (
        <div className="mt-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 p-3.5 text-xs flex items-center gap-2.5 shadow-lg">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="leading-snug">{cancelNotice}</p>
        </div>
      )}

      {/* Editorial Heading */}
      <section className="my-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
          Organiser Console
        </p>
        <h1 className="font-serif text-4xl text-white leading-tight">
          Event rooms &{" "}
          <span className="italic text-white/85">entrance QR codes.</span>
        </h1>
        <p className="text-xs text-white/70 leading-relaxed">
          Rooms stay active until you manually close them. Closing a room
          immediately expires attendee discovery for the night.
        </p>
      </section>

      {/* Mode Switcher */}
      <nav className="grid grid-cols-3 gap-1.5 rounded-2xl bg-white/[0.07] border border-white/12 p-1 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("manage")}
          className={`rounded-xl py-2.5 px-2 text-xs font-semibold transition-all ${
            activeTab === "manage"
              ? "bg-white text-[#2b0712] shadow-sm"
              : "text-white/75 hover:text-white"
          }`}
        >
          Rooms ({rooms.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`rounded-xl py-2.5 px-2 text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
            activeTab === "create"
              ? "bg-white text-[#2b0712] shadow-sm"
              : "text-white/75 hover:text-white"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Room</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("metrics");
            loadRoomsAndMetrics();
          }}
          className={`rounded-xl py-2.5 px-2 text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
            activeTab === "metrics"
              ? "bg-white text-[#2b0712] shadow-sm"
              : "text-white/75 hover:text-white"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Pilot Funnel</span>
        </button>
      </nav>

      {/* TAB 1: Manage Rooms & Manual Closure */}
      {activeTab === "manage" && (
        <section className="flex-1 space-y-3 my-auto">
          {rooms.map((room) => (
            <div
              key={room.code}
              className="rounded-[26px] bg-white text-[#2b0712] p-5 shadow-xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        room.isActive
                          ? "bg-[#541126] text-white"
                          : "bg-[#f7eff1] text-[#6e4753] border border-[#eadadd]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          room.isActive
                            ? "bg-white animate-pulse"
                            : "bg-[#9c7a84]"
                        }`}
                      />
                      {room.isActive ? "Open Tonight" : "Closed"}
                    </span>
                    <span className="font-mono text-xs font-bold text-burgundy-800">
                      #{room.code}
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl text-[#2b0712] leading-snug truncate">
                    {room.name}
                  </h2>
                  <p className="text-xs text-[#6e4753] truncate">
                    {room.venue} · {room.city}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPosterRoom(room)}
                  className="shrink-0 h-11 w-11 rounded-2xl bg-[#f7eff1] hover:bg-[#efe2e5] border border-[#eadadd] text-[#2b0712] flex items-center justify-center transition-colors"
                  title="Open Printable QR Poster"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[#efe2e5] text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedPosterRoom(room)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-[#f7eff1] hover:bg-[#efe2e5] text-[#2b0712] font-semibold py-2.5 px-1.5 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Poster</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyRoomLink(room.code)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-[#f7eff1] hover:bg-[#efe2e5] text-[#2b0712] font-semibold py-2.5 px-1.5 transition-colors"
                >
                  {copiedCode === room.code ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleRoomStatus(room)}
                  className={`flex items-center justify-center gap-1 rounded-xl font-semibold py-2.5 px-1.5 transition-colors ${
                    room.isActive
                      ? "bg-[#541126] hover:bg-[#691630] text-white"
                      : "bg-[#f7eff1] hover:bg-[#efe2e5] text-[#541126]"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{room.isActive ? "Close" : "Reopen"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRoomToCancel(room)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2.5 px-1.5 transition-colors"
                  title="Cancel Event and Purge All Data"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* TAB 2: Create New Event Room */}
      {activeTab === "create" && (
        <section className="my-auto">
          <form
            onSubmit={handleCreateRoom}
            className="rounded-[28px] bg-white text-[#2b0712] p-6 shadow-2xl space-y-4"
          >
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy-700 mb-1.5">
                Event / Room Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Midnight Warehouse Rave"
                className="w-full rounded-2xl bg-[#f7eff1] border border-[#eadadd] px-4 py-3.5 text-sm font-medium text-[#2b0712] placeholder:text-[#9c7a84] focus:outline-none focus:ring-2 focus:ring-burgundy-800 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy-700 mb-1.5">
                  Venue
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Landmark Beach"
                  className="w-full rounded-2xl bg-[#f7eff1] border border-[#eadadd] px-3.5 py-3.5 text-sm font-medium text-[#2b0712] placeholder:text-[#9c7a84] focus:outline-none focus:ring-2 focus:ring-burgundy-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy-700 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lagos"
                  className="w-full rounded-2xl bg-[#f7eff1] border border-[#eadadd] px-3 py-3.5 text-sm font-medium text-[#2b0712] placeholder:text-[#9c7a84] focus:outline-none focus:ring-2 focus:ring-burgundy-800 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy-700 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
                  className="w-full rounded-2xl bg-[#f7eff1] border border-[#eadadd] px-3.5 py-3.5 text-sm font-medium text-[#2b0712] focus:outline-none focus:ring-2 focus:ring-burgundy-800"
                >
                  <option value="rave">Rave</option>
                  <option value="festival">Music Festival</option>
                  <option value="party">House / Club Party</option>
                  <option value="gathering">Social Gathering</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy-700">
                    Room Code
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomCode}
                    className="text-[10px] font-semibold text-burgundy-800 underline flex items-center gap-0.5"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    Auto
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={12}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="PULSE26"
                  className="w-full rounded-2xl bg-[#f7eff1] border border-[#eadadd] px-3.5 py-3.5 text-sm font-mono font-bold uppercase text-[#2b0712] placeholder:text-[#9c7a84] focus:outline-none focus:ring-2 focus:ring-burgundy-800 focus:bg-white"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs font-medium text-burgundy-700">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-between rounded-2xl bg-[#541126] hover:bg-[#691630] text-white font-semibold py-4 px-5 text-sm shadow-lg transition-all"
            >
              <span>
                {isSaving
                  ? "Creating Room..."
                  : "Create Room & Generate QR Code"}
              </span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}

      {/* TAB 3: Section 10 Pilot Conversion Funnel Metrics */}
      {activeTab === "metrics" && (
        <section className="flex-1 space-y-3 my-auto">
          {rooms.map((room) => {
            const m = metrics[room.code] || {
              code: room.code,
              activeParticipants: room.activeParticipantCount,
              videosRecorded: 10,
              interestsSent: 2,
              mutualMatches: 1,
              chatsStarted: 1,
            };
            const matchRate =
              m.interestsSent > 0
                ? Math.round((m.mutualMatches / m.interestsSent) * 100)
                : 0;

            return (
              <div
                key={room.code}
                className="rounded-[26px] bg-white text-[#2b0712] p-5 shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#efe2e5] pb-2.5">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-burgundy-800">
                      #{room.code}
                    </span>
                    <h3 className="font-serif text-2xl text-[#2b0712] leading-none">
                      {room.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#f7eff1] border border-[#eadadd] px-3 py-1 text-[11px] font-bold text-[#541126]">
                    {matchRate}% Match Rate
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div className="rounded-xl bg-[#f7eff1] p-2.5">
                    <span className="font-serif italic text-2xl text-[#2b0712] block leading-none">
                      {m.activeParticipants}
                    </span>
                    <span className="text-[10px] font-semibold text-[#6e4753] block mt-1">
                      In Room
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#f7eff1] p-2.5">
                    <span className="font-serif italic text-2xl text-[#2b0712] block leading-none">
                      {m.videosRecorded}
                    </span>
                    <span className="text-[10px] font-semibold text-[#6e4753] block mt-1">
                      8s Videos
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#f7eff1] p-2.5">
                    <span className="font-serif italic text-2xl text-[#2b0712] block leading-none">
                      {m.interestsSent}
                    </span>
                    <span className="text-[10px] font-semibold text-[#6e4753] block mt-1">
                      Interests
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#541126] text-white p-2.5">
                    <span className="font-serif italic text-2xl block leading-none">
                      {m.mutualMatches}
                    </span>
                    <span className="text-[10px] font-semibold text-white/80 block mt-1">
                      Matches
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Printable Venue QR Code Poster Modal */}
      {selectedPosterRoom && (
        <div className="fixed inset-0 z-50 bg-[#160308]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-[390px] rounded-[32px] bg-white text-[#2b0712] p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="font-serif italic text-2xl text-[#2b0712]">
                  linger.
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-burgundy-700 ml-1">
                  Entrance Poster
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPosterRoom(null)}
                className="h-8 w-8 rounded-full bg-[#f7eff1] hover:bg-[#efe2e5] flex items-center justify-center text-[#2b0712]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Burgundy Editorial Poster Frame */}
            <div className="rounded-[24px] bg-gradient-to-b from-[#541126] to-[#2b0712] text-white p-6 text-center space-y-4 shadow-inner">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                  {selectedPosterRoom.venue}
                </p>
                <h3 className="font-serif text-3xl text-white leading-tight">
                  {selectedPosterRoom.name}
                </h3>
                <p className="text-xs font-serif italic text-white/85">
                  Notice someone in the crowd? Don&apos;t let the moment pass.
                </p>
              </div>

              {/* Crisp Scannable Vector SVG QR Code */}
              <div className="mx-auto w-48 h-48 rounded-2xl bg-white p-3.5 shadow-xl flex items-center justify-center">
                {qrMatrix.length > 0 && (
                  <svg
                    viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                    className="w-full h-full"
                    shapeRendering="crispEdges"
                  >
                    {qrMatrix.map((row, rIdx) =>
                      row.map((cell, cIdx) =>
                        cell ? (
                          <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx}
                            y={rIdx}
                            width={1}
                            height={1}
                            fill="#2b0712"
                          />
                        ) : null
                      )
                    )}
                  </svg>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/65">
                  Scan with Phone Camera · Or Enter Code
                </p>
                <p className="font-mono text-lg font-bold tracking-widest text-white">
                  {selectedPosterRoom.code}
                </p>
              </div>
            </div>

            {/* Poster Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#f7eff1] hover:bg-[#efe2e5] text-[#2b0712] font-semibold py-3.5 px-4 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Poster</span>
              </button>

              <Link
                href={`/event/${encodeURIComponent(selectedPosterRoom.code)}`}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#541126] hover:bg-[#691630] text-white font-semibold py-3.5 px-4 shadow-md transition-all"
              >
                <span>Open Room</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Ephemeral Event Cancellation & Purge Modal */}
      {roomToCancel && (
        <div className="fixed inset-0 z-50 bg-[#160308]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-[380px] rounded-[32px] bg-white text-[#2b0712] p-6 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700">
                Cancel & Instant Ephemeral Purge
              </span>
              <h3 className="font-serif text-2xl text-[#2b0712]">
                Cancel {roomToCancel.name}?
              </h3>
              <p className="text-xs text-[#6e4753] leading-relaxed">
                As soon as you cancel this event room, <strong>all attendee selfie videos, locations, mutual matches, and chat histories will be immediately and irreversibly deleted</strong> from Supabase and our servers.
              </p>
            </div>

            <div className="rounded-2xl bg-[#fdf5f5] border border-red-100 p-3 text-[11px] text-red-800 space-y-1 font-medium">
              <p className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
                Permanent cascade deletion in PostgreSQL
              </p>
              <p className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
                Attendee profiles and looks will expire immediately
              </p>
              <p className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
                This action cannot be undone
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoomToCancel(null)}
                disabled={isCancelling}
                className="w-full py-3 px-4 rounded-2xl bg-[#f7eff1] hover:bg-[#efe2e5] text-[#541126] font-semibold text-xs transition-colors"
              >
                Keep Event
              </button>

              <button
                type="button"
                onClick={handleConfirmCancelRoom}
                disabled={isCancelling}
                className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isCancelling ? "Purging..." : "Yes, Purge All"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-6 text-center">
        <p className="text-[11px] text-white/55">
          Display the room QR code at the venue entrance so guests land directly
          in tonight&apos;s room.
        </p>
      </footer>
    </main>
  );
}
