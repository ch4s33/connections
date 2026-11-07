"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  RotateCcw,
  Check,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  ArrowUpRight,
  Smartphone,
} from "lucide-react";
import { RECORDING_CONFIG, RECORDING_PROMPTS } from "@/lib/mock-events";
import { getSupportedVideoMimeType } from "@/lib/media";

interface SelfieVideoRecorderProps {
  eventCode: string;
  eventName: string;
  displayName: string;
  onComplete: (
    videoBlobUrl: string,
    durationSeconds: number,
    videoBlob?: Blob | null
  ) => void;
}

type RecorderPhase =
  | "requesting_permission"
  | "permission_denied"
  | "ready"
  | "countdown"
  | "recording"
  | "preview";

export function SelfieVideoRecorder({
  eventCode,
  eventName,
  displayName,
  onComplete,
}: SelfieVideoRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>("requesting_permission");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [confirmChecks, setConfirmChecks] = useState({
    faceAndHair: true,
    outfitVisible: true,
  });

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopMediaStream = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const initCamera = useCallback(async () => {
    setPhase("requesting_permission");
    setErrorMessage(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setPhase("permission_denied");
      setErrorMessage(
        "In-browser stream is blocked on this connection. Tap 'Open Native Phone Camera' below to record directly with your phone's camera."
      );
      return;
    }

    try {
      stopMediaStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }
      setPhase("ready");
    } catch (err) {
      setPhase("permission_denied");
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Browser camera permission was declined. Tap 'Allow' in your browser settings, or use your phone's native camera below."
          : "Could not start the in-browser camera stream. You can record directly using your phone's native camera below.";
      setErrorMessage(message);
    }
  }, [stopMediaStream]);

  useEffect(() => {
    initCamera();
    return () => {
      stopMediaStream();
    };
  }, [initCamera, stopMediaStream]);

  useEffect(() => {
    if (
      (phase === "ready" || phase === "countdown" || phase === "recording") &&
      liveVideoRef.current &&
      mediaStreamRef.current
    ) {
      if (liveVideoRef.current.srcObject !== mediaStreamRef.current) {
        liveVideoRef.current.srcObject = mediaStreamRef.current;
        liveVideoRef.current.play().catch(() => {});
      }
    }
  }, [phase]);

  const handleNativeCameraVideoCapture = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setRecordedBlob(file);
    setRecordedVideoUrl(url);
    setRecordedDuration(8);
    setPhase("preview");
  };

  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const beginMediaRecording = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      initCamera();
      return;
    }

    chunksRef.current = [];
    setElapsedSeconds(0);
    setErrorMessage(null);

    const mimeType = getSupportedVideoMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

    try {
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const duration = Math.min(
          RECORDING_CONFIG.MAX_DURATION_SECONDS,
          Math.max(0, (Date.now() - startTimeRef.current) / 1000)
        );

        if (duration < RECORDING_CONFIG.MIN_DURATION_SECONDS) {
          setErrorMessage(
            `Please record for at least ${RECORDING_CONFIG.MIN_DURATION_SECONDS} seconds so both your face and outfit are visible.`
          );
          setPhase("ready");
          setElapsedSeconds(0);
          return;
        }

        const blobType = mimeType || "video/mp4";
        const videoBlob = new Blob(chunksRef.current, { type: blobType });
        const videoUrl = URL.createObjectURL(videoBlob);

        setRecordedBlob(videoBlob);
        setRecordedDuration(Math.round(duration * 10) / 10);
        setRecordedVideoUrl(videoUrl);
        setPhase("preview");
      };

      startTimeRef.current = Date.now();
      recorder.start(200);
      setPhase("recording");

      timerIntervalRef.current = setInterval(() => {
        const secondsPassed = (Date.now() - startTimeRef.current) / 1000;
        if (secondsPassed >= RECORDING_CONFIG.MAX_DURATION_SECONDS) {
          setElapsedSeconds(RECORDING_CONFIG.MAX_DURATION_SECONDS);
          stopRecording();
        } else {
          setElapsedSeconds(secondsPassed);
        }
      }, 100);
    } catch {
      setErrorMessage(
        "In-browser recording isn't supported on this browser version. Use the Native Phone Camera button below."
      );
      setPhase("permission_denied");
    }
  }, [initCamera, stopRecording]);

  const handleStartWithCountdown = () => {
    setErrorMessage(null);
    setCountdownNum(3);
    setPhase("countdown");

    let current = 3;
    const interval = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(interval);
        beginMediaRecording();
      } else {
        setCountdownNum(current);
      }
    }, 850);
  };

  const handleRetake = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    setRecordedBlob(null);
    setElapsedSeconds(0);
    setErrorMessage(null);
    if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
      initCamera();
    } else {
      setPhase("ready");
    }
  };

  const handleConfirmAndUpload = async () => {
    if (!recordedVideoUrl) return;
    setIsUploading(true);
    try {
      await onComplete(recordedVideoUrl, recordedDuration, recordedBlob);
    } finally {
      setIsUploading(false);
    }
  };

  const activePrompt =
    RECORDING_PROMPTS.find(
      (p) => elapsedSeconds >= p.startSecond && elapsedSeconds < p.endSecond
    ) || RECORDING_PROMPTS[RECORDING_PROMPTS.length - 1];

  const progressPercentage = Math.min(
    100,
    (elapsedSeconds / RECORDING_CONFIG.MAX_DURATION_SECONDS) * 100
  );

  const canStopEarly = elapsedSeconds >= RECORDING_CONFIG.MIN_DURATION_SECONDS;

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Hidden Native Front Camera Input for Mobile Reliability */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="video/*"
        capture="user"
        onChange={handleNativeCameraVideoCapture}
        className="hidden"
      />

      {/* Editorial Viewfinder Frame */}
      <div className="relative w-full aspect-[9/14] max-h-[68dvh] rounded-[32px] overflow-hidden bg-[#160309] border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.65)] flex items-center justify-center">
        {phase !== "preview" && (
          <video
            ref={liveVideoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}

        {phase === "preview" && recordedVideoUrl && (
          <video
            ref={previewVideoRef}
            src={recordedVideoUrl}
            playsInline
            loop
            autoPlay
            controls
            className="w-full h-full object-cover"
          />
        )}

        {/* Requesting Camera State */}
        {phase === "requesting_permission" && (
          <div className="absolute inset-0 bg-[#2b0712] flex flex-col items-center justify-center p-7 text-center">
            <div className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mb-4 animate-pulse">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-white">
              Starting front camera
            </h3>
            <p className="text-xs text-white/65 mt-2 max-w-[26ch] leading-relaxed">
              Tap <strong>Allow</strong> when prompted, or open your phone&apos;s
              camera directly below.
            </p>
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white text-[#2b0712] font-semibold py-3.5 px-5 text-xs shadow-lg"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open Native Phone Camera</span>
            </button>
          </div>
        )}

        {/* Permission Denied / Mobile Native Camera Fallback */}
        {phase === "permission_denied" && (
          <div className="absolute inset-0 bg-[#2b0712] flex flex-col items-center justify-center p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-2xl text-white">
              Record Tonight&apos;s Look
            </h3>
            <p className="text-xs text-white/70 mt-1.5 max-w-[28ch] leading-relaxed">
              {errorMessage}
            </p>

            <div className="w-full max-w-xs rounded-2xl bg-white/[0.07] border border-white/15 p-3.5 my-4 text-left space-y-1 text-xs text-white/85">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60 mb-1">
                In your 8s selfie video, show:
              </p>
              <p>1. Your face & hairstyle (0–3s)</p>
              <p>2. Tilt down to show your outfit (3–6s)</p>
              <p>3. Back to your face (6–8s)</p>
            </div>

            <div className="w-full max-w-xs space-y-2.5">
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-[#2b0712] font-bold py-4 px-4 text-xs shadow-xl hover:bg-white/95 transition-all"
              >
                <Smartphone className="w-4 h-4" />
                <span>Open Native Phone Camera</span>
              </button>

              <button
                type="button"
                onClick={initCamera}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold py-3 px-4 text-xs border border-white/15 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry In-Browser Camera</span>
              </button>

              <button
                type="button"
                onClick={() => onComplete("simulated-selfie-video", 8, null)}
                className="w-full flex items-center justify-center gap-1.5 text-white/60 hover:text-white py-2 text-[11px] transition-colors"
              >
                <span>Skip with Demo Preview</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Refined Viewfinder Guidance Overlay */}
        {(phase === "ready" ||
          phase === "countdown" ||
          phase === "recording") && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5">
            <div className="space-y-3">
              <div className="relative h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{ width: `${progressPercentage}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-[#2b0712]/60"
                  style={{ left: "37.5%" }}
                />
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-[#2b0712]/60"
                  style={{ left: "75%" }}
                />
              </div>

              <div className="rounded-2xl bg-[#2b0712]/80 backdrop-blur-md border border-white/15 px-4 py-3 text-white">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  <span>
                    {phase === "recording"
                      ? activePrompt.badgeText
                      : "8-Second Selfie Video"}
                  </span>
                  <span className="font-mono text-white">
                    {phase === "recording"
                      ? `${elapsedSeconds.toFixed(1)}s / 8.0s`
                      : "0–3s Face · 3–6s Outfit"}
                  </span>
                </div>
                <p className="font-serif text-xl text-white mt-0.5 leading-snug">
                  {phase === "recording"
                    ? activePrompt.title
                    : "Show your face, hair, and outfit"}
                </p>
                <p className="text-[11px] text-white/75 mt-0.5">
                  {phase === "recording"
                    ? activePrompt.instruction
                    : "Start at eye level, then angle your phone down to show what you are wearing."}
                </p>
              </div>
            </div>

            <div className="my-auto flex flex-col items-center justify-center">
              <div
                className={`w-48 h-60 rounded-[36px] border transition-all duration-500 flex flex-col items-center justify-between p-4 ${
                  phase === "recording" && activePrompt.targetZone === "lower"
                    ? "border-white/90 bg-white/[0.04] translate-y-3"
                    : "border-white/45"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 bg-[#2b0712]/70 px-3 py-1 rounded-full border border-white/15">
                  {phase === "recording" && activePrompt.targetZone === "lower"
                    ? "2 · Tonight's Outfit"
                    : "1 · Face & Hairstyle"}
                </span>

                {phase === "recording" &&
                  activePrompt.targetZone === "lower" && (
                    <div className="flex items-center gap-1.5 rounded-full bg-white text-[#2b0712] px-3.5 py-1.5 text-xs font-bold shadow-lg animate-bounce">
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>Tilt Down Now</span>
                    </div>
                  )}

                {phase === "recording" &&
                  activePrompt.id === "return_face" && (
                    <div className="flex items-center gap-1.5 rounded-full bg-white text-[#2b0712] px-3.5 py-1.5 text-xs font-bold shadow-lg animate-bounce">
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>Back to Face</span>
                    </div>
                  )}

                <span className="text-[10px] text-white/60">
                  {displayName} · #{eventCode}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/75 px-1">
              <span>{eventName}</span>
              <span>Live Capture</span>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {phase === "countdown" && (
          <div className="absolute inset-0 bg-[#2b0712]/70 backdrop-blur-xs flex flex-col items-center justify-center">
            <span className="font-serif italic text-7xl text-white">
              {countdownNum}
            </span>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/80">
              Start with your face & hair
            </p>
          </div>
        )}

        {/* Preview Header Pill */}
        {phase === "preview" && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#2b0712] font-semibold px-3.5 py-1 text-xs shadow-md">
              <Check className="w-3.5 h-3.5" />
              Preview · {recordedDuration}s
            </span>
            <span className="rounded-full bg-[#2b0712]/80 backdrop-blur-md text-white px-3.5 py-1 text-xs font-medium border border-white/15">
              {displayName}
            </span>
          </div>
        )}
      </div>

      {errorMessage && phase === "ready" && (
        <div className="mt-3 rounded-2xl bg-white/10 border border-white/20 p-3 text-xs text-white text-center">
          {errorMessage}
        </div>
      )}

      {/* Bottom Controls */}
      <div className="mt-4">
        {phase === "ready" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleStartWithCountdown}
              className="w-full flex items-center justify-between rounded-2xl bg-white hover:bg-white/95 active:scale-[0.99] text-[#2b0712] font-bold py-4 px-6 text-sm shadow-xl transition-all"
            >
              <span>Start 8-Second Recording</span>
              <span className="h-3 w-3 rounded-full bg-[#781b37]" />
            </button>
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="w-full text-center text-[11px] text-white/65 hover:text-white py-1"
            >
              Or record with your phone&apos;s native camera app
            </button>
          </div>
        )}

        {phase === "recording" && (
          <button
            type="button"
            onClick={stopRecording}
            disabled={!canStopEarly}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl font-semibold py-4 px-6 text-sm transition-all ${
              canStopEarly
                ? "bg-white text-[#2b0712] shadow-xl"
                : "bg-white/15 text-white/50 cursor-not-allowed"
            }`}
          >
            <span>
              {canStopEarly
                ? "Finish Recording"
                : `Keep recording (${Math.ceil(
                    RECORDING_CONFIG.MIN_DURATION_SECONDS - elapsedSeconds
                  )}s)...`}
            </span>
          </button>
        )}

        {phase === "preview" && recordedVideoUrl && (
          <div className="rounded-[26px] bg-white text-[#2b0712] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy-700">
                Confirm Visibility
              </span>
              <span className="text-xs text-[#6e4753]">
                Can people recognise you?
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <label className="flex items-center gap-2.5 rounded-xl bg-[#f7eff1] border border-[#eadadd] p-3 cursor-pointer font-medium text-[#2b0712]">
                <input
                  type="checkbox"
                  checked={confirmChecks.faceAndHair}
                  onChange={(e) =>
                    setConfirmChecks((prev) => ({
                      ...prev,
                      faceAndHair: e.target.checked,
                    }))
                  }
                  className="accent-[#541126] h-4 w-4 rounded"
                />
                <span>Face & hair visible</span>
              </label>

              <label className="flex items-center gap-2.5 rounded-xl bg-[#f7eff1] border border-[#eadadd] p-3 cursor-pointer font-medium text-[#2b0712]">
                <input
                  type="checkbox"
                  checked={confirmChecks.outfitVisible}
                  onChange={(e) =>
                    setConfirmChecks((prev) => ({
                      ...prev,
                      outfitVisible: e.target.checked,
                    }))
                  }
                  className="accent-[#541126] h-4 w-4 rounded"
                />
                <span>Outfit shown</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#f7eff1] hover:bg-[#efe2e5] text-[#2b0712] font-semibold py-3.5 px-4 text-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                disabled={
                  !confirmChecks.faceAndHair ||
                  !confirmChecks.outfitVisible ||
                  isUploading
                }
                onClick={handleConfirmAndUpload}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#541126] hover:bg-[#691630] disabled:opacity-40 text-white font-semibold py-3.5 px-4 text-xs shadow-md transition-all"
              >
                <span>{isUploading ? "Uploading..." : "Enter Room"}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
