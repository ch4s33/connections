"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  ArrowUpRight,
  Camera,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { DEMO_EVENTS } from "@/lib/mock-events";
import { parseEventCodeInput } from "@/lib/media";
import { EventDetails } from "@/types/event";

export function QrEntryCard() {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDecodingQr, setIsDecodingQr] = useState(false);
  const [rooms, setRooms] = useState<EventDetails[]>(
    Object.values(DEMO_EVENTS)
  );
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => {
        if (data.rooms) {
          setRooms(data.rooms);
        }
      })
      .catch(() => {});
  }, []);

  const activeRooms = rooms.filter((r) => r.isActive);

  const handleJoinEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const code = parseEventCodeInput(rawInput);
    if (!code) {
      setError("Enter a valid room code or scan the venue QR code.");
      return;
    }
    setError(null);
    router.push(`/event/${encodeURIComponent(code)}`);
  };

  const handleQuickSelect = (code: string) => {
    setError(null);
    router.push(`/event/${encodeURIComponent(code)}`);
  };

  const handleQrImageCapture = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingQr(true);
    setError(null);

    try {
      if ("BarcodeDetector" in window) {
        const imageBitmap = await createImageBitmap(file);
        // @ts-expect-error BarcodeDetector is supported in modern mobile WebKit/Blink
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const barcodes = await detector.detect(imageBitmap);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          const parsedCode = parseEventCodeInput(barcodes[0].rawValue);
          if (parsedCode) {
            router.push(`/event/${encodeURIComponent(parsedCode)}`);
            return;
          }
        }
      }
      setError(
        "Point your phone's Camera app directly at the venue QR poster, or type the code printed below it."
      );
    } catch {
      setError(
        "Scan the venue QR with your phone camera, or enter the event code below."
      );
    } finally {
      setIsDecodingQr(false);
      if (qrFileInputRef.current) {
        qrFileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Crisp White Primary Card on Deep Burgundy Background */}
      <div className="rounded-[28px] bg-white text-[#2b0712] p-6 shadow-[0_24px_60px_rgba(18,2,7,0.55)]">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-burgundy-700 mb-1">
              Event Check-In
            </span>
            <h2 className="text-xl font-bold tracking-tight text-[#2b0712]">
              Enter tonight&apos;s room
            </h2>
            <p className="text-xs text-[#6e4753] mt-1 leading-relaxed">
              Scan the QR code at the venue entrance with your phone camera, or
              enter the room code below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => qrFileInputRef.current?.click()}
            title="Scan QR Code"
            className="h-12 w-12 rounded-2xl bg-burgundy-900 text-white flex items-center justify-center shrink-0 shadow-md hover:bg-burgundy-800 active:scale-95 transition-all"
          >
            <QrCode className="w-5 h-5" />
          </button>
          <input
            ref={qrFileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleQrImageCapture}
            className="hidden"
          />
        </div>

        <form onSubmit={handleJoinEvent} className="space-y-3">
          <div className="relative flex items-center">
            <input
              id="event-code-input"
              type="text"
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Room code (e.g. NEON26)"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-2xl bg-[#f7eff1] border border-[#eadadd] px-4 py-4 pr-11 text-sm font-semibold text-[#2b0712] placeholder:text-[#9c7a84] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-burgundy-800 focus:bg-white transition-all uppercase tracking-wider"
            />
            <button
              type="button"
              onClick={() => qrFileInputRef.current?.click()}
              title="Open camera to scan QR"
              className="absolute right-3 p-2 rounded-xl text-[#781b37] hover:bg-burgundy-100 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-burgundy-50 border border-burgundy-200 p-3 text-xs text-burgundy-900">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-burgundy-700" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isDecodingQr}
            className="w-full flex items-center justify-between rounded-2xl bg-[#541126] hover:bg-[#691630] active:scale-[0.99] text-white font-semibold py-4 px-5 text-sm shadow-lg shadow-burgundy-950/25 transition-all"
          >
            <span>{isDecodingQr ? "Reading QR..." : "Continue to Room"}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Subtle Glass Burgundy Live Rooms List */}
      <div className="rounded-[24px] bg-white/[0.06] border border-white/12 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
              Active Rooms Tonight
            </span>
          </div>
          <span className="text-[11px] text-white/50">Tap to enter</span>
        </div>

        <div className="divide-y divide-white/10">
          {activeRooms.map((evt) => (
            <button
              key={evt.code}
              type="button"
              onClick={() => handleQuickSelect(evt.code)}
              className="w-full flex items-center justify-between py-3 px-2 first:pt-1 last:pb-1 text-left hover:bg-white/[0.04] rounded-xl transition-colors group"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-white truncate">
                    {evt.name}
                  </span>
                </div>
                <p className="text-xs text-white/60 truncate mt-0.5">
                  {evt.venue} ·{" "}
                  <span className="text-white/85 font-medium">
                    {evt.activeParticipantCount} inside
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-white bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
                  {evt.code}
                </span>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
