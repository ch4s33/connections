import Link from "next/link";
import { QrEntryCard } from "@/components/qr-entry-card";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col justify-between px-6 py-7 pb-safe">
      {/* Minimal Editorial Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="font-serif italic text-3xl tracking-tight text-white">
            linger
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/host"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white transition-colors"
          >
            <span>Host a Room</span>
          </Link>
        </div>
      </header>

      {/* Editorial Hero Statement */}
      <section className="my-7 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
          In-Person Connection
        </p>
        <h1 className="text-[38px] font-normal font-serif leading-[1.06] tracking-tight text-white">
          Notice someone in the crowd?{" "}
          <span className="italic text-white/85">
            Don&apos;t let the moment pass.
          </span>
        </h1>
        <p className="text-sm text-white/75 leading-relaxed max-w-[34ch]">
          See who is around you right now—their face, hair, and tonight&apos;s
          outfit—and express interest before the night ends.
        </p>
      </section>

      {/* Primary Action Card (White & Burgundy) */}
      <section className="my-1">
        <QrEntryCard />
      </section>

      {/* Clean 3-Pillar Editorial Strip */}
      <section className="mt-8 pt-6 border-t border-white/12 space-y-5">
        <div className="grid grid-cols-3 gap-3 text-left">
          <div className="space-y-1">
            <span className="font-serif italic text-lg text-white/90">01</span>
            <h3 className="text-xs font-semibold text-white">
              Tonight&apos;s Look
            </h3>
            <p className="text-[11px] text-white/60 leading-snug">
              8-second live selfie video showing face, hair & outfit.
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-serif italic text-lg text-white/90">02</span>
            <h3 className="text-xs font-semibold text-white">Nearby First</h3>
            <p className="text-[11px] text-white/60 leading-snug">
              Prioritises people physically closest to you right now.
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-serif italic text-lg text-white/90">03</span>
            <h3 className="text-xs font-semibold text-white">Mutual Only</h3>
            <p className="text-[11px] text-white/60 leading-snug">
              Identified interest. Chat unlocks only when both match.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/50 pt-2 border-t border-white/10">
          <span>Temporary event-only profiles</span>
          <Link
            href="/privacy"
            className="underline hover:text-white transition-colors"
          >
            Privacy & NDPA 2023 Terms
          </Link>
        </div>
      </section>
    </main>
  );
}
