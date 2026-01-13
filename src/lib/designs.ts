import { supabase } from "@/integrations/supabase/client";
import type { Design, DesignTemplate, DesignTheme, BackgroundConfig, Section } from "@/types/design";
import type { Json } from "@/integrations/supabase/types";

// Helper to safely cast JSON to typed objects
function parseDesignFromRow(row: {
  id: string;
  template: string;
  theme: Json;
  background: Json;
  sections: Json;
  entity_id: string | null;
  entity_type: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}): Design {
  return {
    id: row.id,
    template: row.template as DesignTemplate,
    theme: row.theme as unknown as DesignTheme,
    background: row.background as unknown as BackgroundConfig,
    sections: (row.sections as unknown as Section[]) || [],
    entity_id: row.entity_id || undefined,
    entity_type: row.entity_type || undefined,
    created_by: row.created_by || undefined,
    created_at: row.created_at || undefined,
    updated_at: row.updated_at || undefined,
  };
}

// Get a design by ID
export async function getDesign(id: string): Promise<Design | null> {
  const { data, error } = await supabase
    .from("designs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return parseDesignFromRow(data);
}

// Save (create or update) a design
export async function saveDesign(design: Design, userId: string): Promise<Design> {
  const payload = {
    template: design.template,
    theme: design.theme as unknown as Json,
    background: design.background as unknown as Json,
    sections: design.sections as unknown as Json,
    entity_id: design.entity_id || null,
    entity_type: design.entity_type || null,
    created_by: userId,
  };

  if (design.id) {
    // Update existing
    const { data, error } = await supabase
      .from("designs")
      .update(payload)
      .eq("id", design.id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...design,
      id: data.id,
      updated_at: data.updated_at || undefined,
    };
  } else {
    // Create new
    const { data, error } = await supabase
      .from("designs")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return {
      ...design,
      id: data.id,
      created_at: data.created_at || undefined,
      updated_at: data.updated_at || undefined,
    };
  }
}

// List designs, optionally filtered by template
export async function listDesigns(template?: DesignTemplate): Promise<Design[]> {
  let query = supabase
    .from("designs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (template) {
    query = query.eq("template", template);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((item) => parseDesignFromRow(item));
}

// Delete a design
export async function deleteDesign(id: string): Promise<void> {
  const { error } = await supabase.from("designs").delete().eq("id", id);
  if (error) throw error;
}

// Get design by entity (e.g., festival id)
export async function getDesignByEntity(
  entityType: string,
  entityId: string
): Promise<Design | null> {
  const { data, error } = await supabase
    .from("designs")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return parseDesignFromRow(data);
}
