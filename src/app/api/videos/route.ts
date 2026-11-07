import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { VIDEOS_DIR, memoryStore } from "@/lib/server-store";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("video") as File | null;
    const eventCode = ((formData.get("eventCode") as string) || "ROOM")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");

    if (!file) {
      return NextResponse.json(
        { error: "No video file provided." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const isMp4 =
      file.type.includes("mp4") || file.name.toLowerCase().endsWith(".mp4");
    const ext = isMp4 ? "mp4" : "webm";
    const contentType = isMp4 ? "video/mp4" : "video/webm";
    const filename = `${eventCode}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    memoryStore.videos[filename] = { buffer, contentType };

    try {
      await fs.mkdir(VIDEOS_DIR, { recursive: true });
      await fs.writeFile(path.join(VIDEOS_DIR, filename), buffer);
    } catch {
      // Stored in memoryStore.videos fallback
    }

    return NextResponse.json(
      {
        videoUrl: `/api/videos/${filename}`,
        filename,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to upload selfie video." },
      { status: 500 }
    );
  }
}
