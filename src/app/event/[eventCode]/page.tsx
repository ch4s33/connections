"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Users,
  Camera,
  Lock,
} from "lucide-react";
import { getEventByCode } from "@/lib/mock-events";
import { EventDetails } from "@/types/event";

export default function EventLandingPage() {
  const params = useParams<{ eventCode: string }>();
  const router = useRouter();
  const rawCode = Array.isArray(params?.eventCode)
    ? params.eventCode[0]
    : params?.eventCode || "NEON26";

  const [event, setEvent] = useState<EventDetails>(() =>
    getEventByCode(decodeURIComponent(rawCode))
  );
  const [displayName, setDisplayName] = useState("");
  const [contactHandle, setContactHandle] = useState("");
  const [consentChecked, setConsentChecked] = useState(true);

  useEffect(() => {
    const code = decodeURIComponent(rawCode);
    fetch(`/api/rooms?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.room) {
          setEvent(data.room);
        }
      })
      .catch(() => {});
  }, [rawCode]);

  const recordUrl = `/event/${encodeURIComponent(
    event.code
  )}/record?name=${encodeURIComponent(displayName.trim() || "Guest")}`;

  const saveFrictionlessSession = () => {
    const finalName = displayName.trim() || "Guest";
    try {
      if (typeof window !== "undefined") {
        let deviceToken = localStorage.getItem("linger_device_token");
        if (!deviceToken) {
          deviceToken = `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
          localStorage.setItem("linger_device_token", deviceToken);
        }

        sessionStorage.setItem(
          `linger_profile_${event.code}`,
          JSON.stringify({
            displayName: finalName,
            contactHandle: contactHandle.trim() || undefined,
            deviceToken,
            eventCode: event.code,
            consentedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      }
    } catch {
      // Ignore storage restrictions in private mobile browsing
    }
    return finalName;
  };

  const handleProceedToCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentChecked) return;
    const finalName = saveFrictionlessSession();
    router.push(
      `/event/${encodeURIComponent(event.code)}/record?name=${encodeURIComponent(
        finalName
      )}`
    );
  };

  return (
    <main className="flex-1 flex flex-col justify-between px-6 py-7 pb-safe">
      {/* Top Bar */}
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white transition-colors py-2 px-3.5 rounded-full bg-white/10 border border-white/15"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Rooms</span>
        </Link>

        <span className="font-serif italic text-2xl text-white">linger.</span>
      </header>

      {/* Event Context Header */}
      <section className="my-5 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-medium text-white">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              event.isActive ? "bg-white animate-pulse" : "bg-white/40"
            }`}
          />
          <span>Room {event.code}</span>
          <span className="text-white/40">·</span>
          <span className="inline-flex items-center gap-1 text-white/85">
            {event.isActive ? (
              <>
                <Users className="w-3 h-3" />
                {event.activeParticipantCount} here
              </>
            ) : (
              "Closed for tonight"
            )}
          </span>
        </div>

        <h1 className="text-4xl font-serif font-normal text-white tracking-tight leading-[1.08]">
          {event.name}
        </h1>

        <p className="flex items-center gap-1.5 text-xs text-white/70">
          <MapPin className="w-3.5 h-3.5 text-white/60 shrink-0" />
          <span>
            {event.venue}, {event.city}
          </span>
        </p>
      </section>

      {/* Closed Room State vs Open Room Onboarding Card */}
      {!event.isActive ? (
        <section className="my-auto rounded-[28px] bg-white text-[#2b0712] p-6 shadow-2xl space-y-4 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[#f7eff1] border border-[#eadadd] flex items-center justify-center text-[#541126]">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-burgundy-700">
              Room Closed
            </span>
            <h2 className="font-serif text-3xl text-[#2b0712]">
              Tonight&apos;s room has ended
            </h2>
            <p className="text-xs text-[#6e4753] leading-relaxed max-w-[30ch] mx-auto">
              The organiser has closed <strong>{event.name}</strong> and
              temporary selfie videos for this event have expired.
            </p>
          </div>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#541126] text-white font-semibold py-4 px-5 text-xs shadow-md"
          >
            <span>Back to Home</span>
          </Link>
        </section>
      ) : (
        <section className="my-1">
          <form
            method="GET"
            action={`/event/${encodeURIComponent(event.code)}/record`}
            onSubmit={handleProceedToCamera}
            className="rounded-[28px] bg-white text-[#2b0712] p-6 shadow-[0_24px_60px_rgba(18,2,7,0.55)] space-y-4"
          >
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="display-name"
                  className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy-700 mb-1.5"
                >
                  Step 1 · Your Name Tonight
                </label>
                <input
                  id="display-name"
                  name="name"
                  type="text"
                  maxLength={24}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="First name or nickname"
                  className="w-full rounded-2xl bg-[#f7eff1] border border-[#eadadd] px-4 py-3.5 text-sm font-medium text-[#2b0712] placeholder:text-[#9c7a84] focus:outline-none focus:ring-2 focus:ring-burgundy-800 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-handle"
                  className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6e4753] mb-1"
                >
                  Optional · Phone or Email (To Keep Matches)
                </label>
                <input
                  id="contact-handle"
                  type="text"
                  value={contactHandle}
                  onChange={(e) => setContactHandle(e.target.value)}
                  placeholder="Optional — instant guest session active"
                  className="w-full rounded-2xl bg-[#f7eff1] border border-[#eadadd] px-4 py-3 text-xs font-medium text-[#2b0712] placeholder:text-[#9c7a84] focus:outline-none focus:ring-2 focus:ring-burgundy-800 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Step 2 Explanation: The 8-second look check */}
            <div className="rounded-2xl bg-[#faf5f6] border border-[#efe2e5] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy-800">
                  Step 2 · 8-Second Look Check
                </span>
                <span className="text-[11px] font-medium text-[#781b37] bg-burgundy-100 px-2.5 py-0.5 rounded-full">
                  Live Camera Only
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-0.5">
                <div className="rounded-xl bg-white p-2.5 border border-[#eadadd]">
                  <span className="block font-serif italic text-base text-burgundy-800">
                    0–3s
                  </span>
                  <span className="text-[11px] font-semibold text-[#2b0712] block mt-0.5">
                    Face & Hair
                  </span>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-[#eadadd]">
                  <span className="block font-serif italic text-base text-burgundy-800">
                    3–6s
                  </span>
                  <span className="text-[11px] font-semibold text-[#2b0712] block mt-0.5">
                    Tilt to Outfit
                  </span>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-[#eadadd]">
                  <span className="block font-serif italic text-base text-burgundy-800">
                    6–8s
                  </span>
                  <span className="text-[11px] font-semibold text-[#2b0712] block mt-0.5">
                    Back to Face
                  </span>
                </div>
              </div>
            </div>

            {/* NDPA 2023 Explicit Consent Checkbox (Section 7.4) */}
            <label className="flex items-start gap-2.5 text-[11px] text-[#5c3742] cursor-pointer px-1">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="accent-[#541126] h-4 w-4 rounded mt-0.5 shrink-0"
              />
              <span className="leading-snug">
                I consent to sharing my temporary 8s selfie video with guests in{" "}
                <strong>{event.code}</strong> tonight under the{" "}
                <Link
                  href="/privacy"
                  className="underline font-semibold text-[#2b0712]"
                >
                  Privacy & NDPA 2023 Terms
                </Link>
                .
              </span>
            </label>

            <Link
              href={consentChecked ? recordUrl : "#"}
              onClick={(e) => {
                if (!consentChecked) {
                  e.preventDefault();
                  return;
                }
                saveFrictionlessSession();
              }}
              className={`w-full flex items-center justify-between rounded-2xl bg-[#541126] hover:bg-[#691630] active:scale-[0.99] text-white font-semibold py-4 px-5 text-sm shadow-lg shadow-burgundy-950/25 transition-all ${
                !consentChecked ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Camera className="w-4 h-4" />
                <span>Open Camera</span>
              </span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </form>
        </section>
      )}

      {/* Minimal Privacy Footer */}
      <footer className="mt-4 text-center">
        <p className="text-xs text-white/55">
          You can preview and retake your video before anyone in the room sees
          it.
        </p>
      </footer>
    </main>
  );
}
