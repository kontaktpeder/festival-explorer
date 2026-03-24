import { supabase } from "@/integrations/supabase/client";

/**
 * Ensure an asset_handle exists for a given media or festival_media source.
 * Returns the asset_handle id (creates if needed, reuses if existing).
 */
export async function ensureAssetHandle(params: {
  mediaId?: string | null;
  festivalMediaId?: string | null;
  kind?: string | null;
}): Promise<string> {
  const { mediaId, festivalMediaId, kind } = params;

  if (!mediaId && !festivalMediaId) {
    throw new Error("Either mediaId or festivalMediaId is required");
  }

  // Check if handle already exists
  if (mediaId) {
    const { data: existing } = await supabase
      .from("asset_handles" as any)
      .select("id")
      .eq("media_id", mediaId)
      .maybeSingle();
    if (existing) return (existing as any).id;
  }

  if (festivalMediaId) {
    const { data: existing } = await supabase
      .from("asset_handles" as any)
      .select("id")
      .eq("festival_media_id", festivalMediaId)
      .maybeSingle();
    if (existing) return (existing as any).id;
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const insertPayload: Record<string, unknown> = {
    created_by: user.id,
  };
  if (mediaId) insertPayload.media_id = mediaId;
  if (festivalMediaId) insertPayload.festival_media_id = festivalMediaId;
  if (kind) insertPayload.kind = kind;

  const { data, error } = await supabase
    .from("asset_handles" as any)
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) throw error;
  return (data as any).id;
}

/**
 * Resolve asset metadata from an asset_handle id.
 * Uses the asset_handles_resolved view.
 */
export async function resolveAssetMeta(assetId: string): Promise<{
  asset_id: string;
  source_type: "media" | "festival_media";
  source_id: string;
  original_filename: string;
  file_type: string;
  public_url: string;
} | null> {
  const { data, error } = await supabase
    .from("asset_handles_resolved" as any)
    .select("*")
    .eq("asset_id", assetId)
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

/**
 * Resolve multiple asset handles' filenames in a batch.
 * Returns a map of assetId -> filename.
 */
export async function resolveAssetNames(assetIds: string[]): Promise<Record<string, string>> {
  const validIds = assetIds.filter(Boolean);
  if (!validIds.length) return {};

  const { data, error } = await supabase
    .from("asset_handles_resolved" as any)
    .select("asset_id, original_filename")
    .in("asset_id", validIds);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const row of data as any[]) {
    map[row.asset_id] = row.original_filename;
  }
  return map;
}
