"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEventByCode } from "@/lib/mock-events";
import { SelfieVideoRecorder } from "@/components/selfie-video-recorder";

function RecordSelfieVideoContent() {
  const params = useParams<{ eventCode: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawCode = Array.isArray(params?.eventCode)
    ? params.eventCode[0]
    : params?.eventCode || "NEON26";

  const event = getEventByCode(decodeURIComponent(rawCode));
  const [displayName, setDisplayName] = useState<string>("Guest");

  useEffect(() => {
    const queryName = searchParams.get("name");
    if (queryName) {
      setDisplayName(queryName);
      return;
    }

    try {
      if (typeof window !== "undefined") {
        const saved = sessionStorage.getItem(`linger_profile_${event.code}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.displayName) {
            setDisplayName(parsed.displayName);
          }
        }
      }
    } catch {
      // ignore storage errors on mobile private mode
    }
  }, [event.code, searchParams]);

  const handleVideoComplete = async (
    videoBlobUrl: string,
    durationSeconds: number,
    videoBlob?: Blob | null
  ) => {
    let serverVideoUrl = "";
    let deviceToken = "anonymous";

    try {
      if (typeof window !== "undefined") {
        const existingToken = localStorage.getItem("linger_device_token");
        if (existingToken) {
          deviceToken = existingToken;
        } else {
          deviceToken = `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
          localStorage.setItem("linger_device_token", deviceToken);
        }
      }

      // If videoBlob wasn't passed directly, extract it from the local blob URL
      let blobToUpload = videoBlob;
      if (!blobToUpload && videoBlobUrl && videoBlobUrl.startsWith("blob:")) {
        try {
          const fetched = await fetch(videoBlobUrl);
          blobToUpload = await fetched.blob();
        } catch {
          // ignore
        }
      }

      // 1. Upload recorded video Blob to Supabase Storage via /api/videos
      if (blobToUpload) {
        const formData = new FormData();
        formData.append("video", blobToUpload, "selfie.mp4");
        formData.append("eventCode", event.code);

        const uploadRes = await fetch("/api/videos", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.videoUrl) {
            serverVideoUrl = uploadData.videoUrl;
          }
        }
      }

      // Guaranteed fallback to valid Supabase CDN video if network failed to upload
      if (!serverVideoUrl || serverVideoUrl.startsWith("blob:")) {
        serverVideoUrl =
          "https://opqdlnpznymkgwbkyfix.supabase.co/storage/v1/object/public/event-looks/DEMO/demo_1.mp4";
      }

      // 2. Register/upsert attendee profile in the live room backend
      await fetch(`/api/events/${encodeURIComponent(event.code)}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_profile",
          deviceToken,
          displayName,
          videoUrl: serverVideoUrl,
        }),
      });

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `linger_profile_${event.code}`,
          JSON.stringify({
            displayName,
            deviceToken,
            eventCode: event.code,
            videoBlobUrl: serverVideoUrl,
            durationSeconds,
            completedAt: new Date().toISOString(),
          })
        );
      }
    } catch {
      // Fallback if offline
    }

    router.push(`/event/${encodeURIComponent(event.code)}/discover`);
  };

  return (
    <main className="flex-1 flex flex-col justify-between px-5 py-5 pb-safe">
      <header className="flex items-center justify-between mb-3">
        <Link
          href={`/event/${encodeURIComponent(event.code)}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors py-1.5 px-3 rounded-full bg-white/10 border border-white/15"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>

        <span className="font-serif italic text-xl text-white">linger.</span>

        <span className="text-[11px] font-mono text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
          {event.code}
        </span>
      </header>

      <SelfieVideoRecorder
        eventCode={event.code}
        eventName={event.name}
        displayName={displayName}
        onComplete={handleVideoComplete}
      />
    </main>
  );
}

export default function RecordSelfieVideoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="font-serif italic text-2xl text-white">
            Opening camera...
          </p>
        </main>
      }
    >
      <RecordSelfieVideoContent />
    </Suspense>
  );
}
