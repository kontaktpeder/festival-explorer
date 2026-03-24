/**
 * Rider asset read/write helpers.
 *
 * READ:  prefer *_asset_id → fallback to legacy *_media_id
 * WRITE: always set *_asset_id only (never set legacy *_media_id in new flows)
 */

/** Check if a slot has a tech rider attached (asset-first, legacy fallback) */
export function slotHasTechRider(slot: {
  tech_rider_asset_id?: string | null;
  tech_rider_media_id?: string | null;
}): boolean {
  return !!(slot.tech_rider_asset_id || slot.tech_rider_media_id);
}

/** Check if a slot has a hospitality rider attached */
export function slotHasHospRider(slot: {
  hosp_rider_asset_id?: string | null;
  hosp_rider_media_id?: string | null;
}): boolean {
  return !!(slot.hosp_rider_asset_id || slot.hosp_rider_media_id);
}

/** Build the rider write payload – only *_asset_id fields (never set legacy *_media_id) */
export function buildRiderWritePayload(params: {
  techRiderAssetId: string | null;
  hospRiderAssetId: string | null;
}): Record<string, string | null> {
  return {
    tech_rider_asset_id: params.techRiderAssetId || null,
    hosp_rider_asset_id: params.hospRiderAssetId || null,
  };
}

/** Resolve the effective rider ID for a slot (asset-first, legacy fallback) */
export function getEffectiveTechRiderId(slot: {
  tech_rider_asset_id?: string | null;
  tech_rider_media_id?: string | null;
}): string | null {
  return slot.tech_rider_asset_id || slot.tech_rider_media_id || null;
}

export function getEffectiveHospRiderId(slot: {
  hosp_rider_asset_id?: string | null;
  hosp_rider_media_id?: string | null;
}): string | null {
  return slot.hosp_rider_asset_id || slot.hosp_rider_media_id || null;
}
