import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import type { PersonaOption } from "@/hooks/usePersonaSearch";

function PersonaAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const signedUrl = useSignedMediaUrl(avatarUrl, "public");
  return (
    <Avatar className="h-8 w-8">
      {signedUrl && <AvatarImage src={signedUrl} alt={name} />}
      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export interface PersonaSearchPickerProps {
  personas: PersonaOption[];
  isLoading?: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  /** Select mode: clicking the row calls onSelect */
  onSelect?: (persona: PersonaOption) => void;
  /** Action mode: shows a button per row */
  actionLabel?: string;
  onAction?: (persona: PersonaOption) => void;
  actionPendingIds?: Set<string>;
  disabledIds?: Set<string>;
  /** Show a "Søk" button next to the input */
  showSearchButton?: boolean;
  onSearchSubmit?: () => void;
}

export function PersonaSearchPicker({
  personas,
  isLoading,
  searchQuery,
  onSearchQueryChange,
  placeholder = "Søk etter navn...",
  emptyMessage = "Ingen profiler funnet.",
  onSelect,
  actionLabel = "Legg til",
  onAction,
  actionPendingIds,
  disabledIds,
  showSearchButton,
  onSearchSubmit,
}: PersonaSearchPickerProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && showSearchButton && onSearchSubmit) {
      e.preventDefault();
      onSearchSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-base"
        />
        {showSearchButton && (
          <Button
            variant="outline"
            onClick={onSearchSubmit}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Søk"}
          </Button>
        )}
      </div>

      {!showSearchButton && isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {personas.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
          {personas.map((p) => {
            const isPending = actionPendingIds?.has(p.id);
            const isDisabled = disabledIds?.has(p.id);

            if (onAction) {
              return (
                <div key={p.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PersonaAvatar avatarUrl={p.avatar_url ?? null} name={p.name} />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">
                        {p.name}
                      </span>
                      {p.category_tags && p.category_tags.length > 0 && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {p.category_tags.slice(0, 2).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending || isDisabled}
                    onClick={() => onAction(p)}
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : isDisabled ? "(lagt til)" : actionLabel}
                  </Button>
                </div>
              );
            }

            // Select mode
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect?.(p)}
                disabled={isDisabled}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left disabled:opacity-50"
              >
                <PersonaAvatar avatarUrl={p.avatar_url ?? null} name={p.name} />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">
                    {p.name}
                  </span>
                  {p.category_tags && p.category_tags.length > 0 && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {p.category_tags.slice(0, 2).join(", ")}
                    </span>
                  )}
                </div>
                {isDisabled && (
                  <span className="text-xs text-muted-foreground ml-auto">(allerede lagt til)</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!isLoading && personas.length === 0 && searchQuery.trim() && (
        <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
      )}
    </div>
  );
}
