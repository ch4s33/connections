/**
 * Browser Camera & MediaRecorder helpers (Section 7.1)
 * Handles cross-browser video MIME types (iOS Safari mp4 vs Chrome/Android webm)
 */

export function getSupportedVideoMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidateTypes = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

/**
 * Extracts an event code from either a full QR URL (e.g., https://.../event/NEON26)
 * or a raw event code string typed/pasted by the user.
 */
export function parseEventCodeInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      const eventIndex = parts.findIndex((p) => p.toLowerCase() === "event");
      if (eventIndex !== -1 && parts[eventIndex + 1]) {
        return parts[eventIndex + 1].toUpperCase();
      }
      if (parts.length > 0) {
        return parts[parts.length - 1].toUpperCase();
      }
    }
  } catch {
    // Fallback to plain code parsing
  }

  return trimmed.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
}
