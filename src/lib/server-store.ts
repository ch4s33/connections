import os from "os";
import path from "path";

export const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "linger-data")
  : path.join(process.cwd(), "data");

export const VIDEOS_DIR = path.join(DATA_DIR, "videos");

const globalForLinger = globalThis as unknown as {
  lingerMemoryStore?: {
    rooms?: Record<string, unknown>;
    roomStates: Record<string, unknown>;
    videos: Record<string, { buffer: Buffer; contentType: string }>;
  };
};

if (!globalForLinger.lingerMemoryStore) {
  globalForLinger.lingerMemoryStore = {
    roomStates: {},
    videos: {},
  };
}

export const memoryStore = globalForLinger.lingerMemoryStore;
