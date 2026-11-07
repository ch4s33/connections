import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Video, MapPin, Trash2 } from "lucide-react";

export default function PrivacyAndTermsPage() {
  return (
    <main className="flex-1 flex flex-col justify-between px-6 py-7 pb-safe space-y-6">
      {/* Top Bar */}
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white transition-colors py-2 px-3.5 rounded-full bg-white/10 border border-white/15"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>

        <span className="font-serif italic text-2xl text-white">linger.</span>
      </header>

      {/* Editorial Heading */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
          Privacy by Design · NDPA 2023
        </p>
        <h1 className="font-serif text-4xl text-white leading-tight">
          Privacy, Consent &{" "}
          <span className="italic text-white/85">Terms of Use.</span>
        </h1>
        <p className="text-xs text-white/75 leading-relaxed">
          linger. is built for temporary, in-person event discovery. We collect
          only what is needed for tonight&apos;s room and never turn your look
          into a permanent public profile.
        </p>
      </section>

      {/* Primary White Legal & Consent Summary Card */}
      <section className="rounded-[28px] bg-white text-[#2b0712] p-6 shadow-2xl space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-[#f7eff1] border border-[#eadadd] flex items-center justify-center text-[#541126] shrink-0">
            <Video className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#2b0712]">
              1. 8-Second Selfie Video & Visual Recognition
            </h2>
            <p className="text-xs text-[#6e4753] leading-relaxed">
              Your 8-second live selfie video (showing your face, hairstyle, and
              tonight&apos;s outfit) is visible only to attendees checked into
              the same event room. When you express interest in someone, your
              interest is identified so they can view your video before deciding
              whether to match.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 border-t border-[#efe2e5] pt-4">
          <div className="h-10 w-10 rounded-2xl bg-[#f7eff1] border border-[#eadadd] flex items-center justify-center text-[#541126] shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#2b0712]">
              2. Approximate Proximity Only (No Live Tracking)
            </h2>
            <p className="text-xs text-[#6e4753] leading-relaxed">
              If you grant browser location permission, it is used strictly on
              the server to group attendees into approximate proximity bands (
              <em>Very Nearby</em>, <em>Nearby</em>, or <em>In Room</em>). We
              never display your exact GPS coordinates, street address, or a
              live map to any user.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 border-t border-[#efe2e5] pt-4">
          <div className="h-10 w-10 rounded-2xl bg-[#f7eff1] border border-[#eadadd] flex items-center justify-center text-[#541126] shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#2b0712]">
              3. Ephemeral Retention & Room Expiration
            </h2>
            <p className="text-xs text-[#6e4753] leading-relaxed">
              Profiles and selfie videos are temporary and tied to a single
              event room. You can pause your visibility or tap{" "}
              <strong>Leave Room</strong> at any time to immediately remove your
              profile. When the event organiser closes the room, discovery ends
              and event videos expire.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 border-t border-[#efe2e5] pt-4">
          <div className="h-10 w-10 rounded-2xl bg-[#f7eff1] border border-[#eadadd] flex items-center justify-center text-[#541126] shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#2b0712]">
              4. Nigeria Data Protection Act (NDPA) 2023 Rights
            </h2>
            <p className="text-xs text-[#6e4753] leading-relaxed">
              In accordance with the Nigeria Data Protection Act 2023, we
              process your temporary event video and proximity band solely on
              the basis of your explicit consent. You have the right to withdraw
              consent, pause discovery, block/report any participant, or erase
              your active room data at any moment.
            </p>
          </div>
        </div>
      </section>

      {/* Community Conduct Note */}
      <section className="rounded-[24px] bg-white/[0.06] border border-white/12 p-4 text-xs text-white/75 leading-relaxed">
        <strong className="text-white">Event Code of Conduct:</strong> Private
        messaging unlocks only after mutual interest. Harassment, non-consensual
        recording of other guests, or impersonation will result in immediate
        removal from the event room.
      </section>

      <footer className="text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-2xl bg-white text-[#2b0712] font-semibold py-3.5 px-6 text-xs shadow-lg"
        >
          Return to linger.
        </Link>
      </footer>
    </main>
  );
}
