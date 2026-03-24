import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type EventIssueRow = Database["public"]["Tables"]["event_issue"]["Row"];

const severityColor: Record<string, string> = {
  critical: "text-destructive",
  high: "text-amber-600 dark:text-amber-400",
  medium: "text-muted-foreground",
  low: "text-muted-foreground",
};

const ISSUE_LABELS: Record<string, string> = {
  artist_cancelled: "Artist avlyst",
  rider_missing: "Rider mangler",
};

function issueLabel(issue: EventIssueRow): string {
  return ISSUE_LABELS[issue.type] ?? issue.type.replace(/_/g, " ");
}

export function OpenIssuesList(props: {
  issues: EventIssueRow[];
  onFindReplacement?: (issue: EventIssueRow) => void;
  onScrollToSlot?: (slotId: string) => void;
}) {
  if (!props.issues.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Åpne saker</p>
      {props.issues.map((issue) => (
        <div
          key={issue.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => props.onScrollToSlot?.(issue.related_program_slot_id)}
        >
          <div className="text-sm">
            <span className={severityColor[issue.severity] ?? "text-foreground"}>
              {issueLabel(issue)}
            </span>
            <span className="text-muted-foreground"> · {issue.severity}</span>
          </div>
          <div className="flex items-center gap-2">
            {issue.type === "artist_cancelled" && props.onFindReplacement && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onFindReplacement!(issue);
                }}
              >
                Finn erstatter
              </Button>
            )}
            {issue.type === "rider_missing" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onScrollToSlot?.(issue.related_program_slot_id);
                }}
              >
                Gå til post
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
