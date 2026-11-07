import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { VIDEOS_DIR, memoryStore } from "@/lib/server-store";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(VIDEOS_DIR, safeFilename);

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch {
      const cached = memoryStore.videos[safeFilename];
      if (!cached) {
        return NextResponse.json({ error: "Video not found." }, { status: 404 });
      }
      buffer = cached.buffer;
    }

    const contentType = safeFilename.endsWith(".mp4")
      ? "video/mp4"
      : "video/webm";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }
}
