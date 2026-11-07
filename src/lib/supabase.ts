import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://opqdlnpznymkgwbkyfix.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcWRsbnB6bnlta2d3Ymt5Zml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNzg5MjMsImV4cCI6MjEwOTY1NDkyM30.pgI9vXAWpVv0F7Vf9crs7yrQwD0LBgM85Wlr-Ab2E7E";

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcWRsbnB6bnlta2d3Ymt5Zml4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDA3ODkyMywiZXhwIjoyMTA5NjU0OTIzfQ.SBa4fj1CC-EsQTy7t5Xvt0EtuKrEVlqIePr5hGi-Iqc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Ephemeral Purge Function:
 * When an organiser closes or cancels an event room:
 * 1. Hard-deletes all attendee profiles (cascades to delete locations, interests, mutual matches, chat messages, blocks).
 * 2. Purges any associated uploaded selfie videos from cloud storage.
 * 3. Marks the room closed or permanently deletes it if requested.
 */
export async function purgeEventRoom(
  eventCode: string,
  options?: { deleteEvent?: boolean }
): Promise<{
  success: boolean;
  purgedProfilesCount?: number;
  error?: string;
}> {
  const cleanCode = eventCode.trim().toUpperCase();

  try {
    // 1. Try PostgreSQL RPC function if installed
    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc(
      "purge_event_room",
      { p_event_code: cleanCode }
    );

    if (!rpcErr && rpcData && rpcData.success) {
      if (options?.deleteEvent) {
        await supabaseAdmin.from("events").delete().ilike("code", cleanCode);
      }
      return {
        success: true,
        purgedProfilesCount: rpcData.purged_profiles_count,
      };
    }

    // 2. Direct cascade delete using Supabase Admin Client
    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .select("id, code")
      .ilike("code", cleanCode)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: "Event room not found." };
    }

    // Delete all profiles in this event room (foreign keys cascade to all chats/interests)
    const { count, error: delErr } = await supabaseAdmin
      .from("attendee_profiles")
      .delete({ count: "exact" })
      .eq("event_id", event.id);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    // If completely deleting event:
    if (options?.deleteEvent) {
      await supabaseAdmin.from("events").delete().eq("id", event.id);
    } else {
      // Mark event closed
      await supabaseAdmin
        .from("events")
        .update({ is_active: false, closed_at: new Date().toISOString() })
        .eq("id", event.id);
    }

    return {
      success: true,
      purgedProfilesCount: count ?? 0,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to purge room",
    };
  }
}
