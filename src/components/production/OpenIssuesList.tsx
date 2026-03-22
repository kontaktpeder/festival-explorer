import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type EventIssueRow = Database["public"]["Tables"]["event_issue"]["Row"];

const severityColor: Record<string, string> = {
  critical: "text-destructive",
  high: "text-amber-600 dark:text-amber-400",
  medium: "text-muted-foreground",
  low: "text-muted-foreground",
};

export function OpenIssuesList(props: {
  issues: EventIssueRow[];
  onFindReplacement?: (issue: EventIssueRow) => void;
}) {
  if (!props.issues.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Åpne saker</p>
      {props.issues.map((issue) => (
        <div
          key={issue.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
        >
          <div className="text-sm">
            <span className={severityColor[issue.severity] ?? "text-foreground"}>
              {issue.type.replace(/_/g, " ")}
            </span>
            <span className="text-muted-foreground"> · {issue.severity}</span>
          </div>
          {issue.type === "artist_cancelled" && props.onFindReplacement && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => props.onFindReplacement!(issue)}
            >
              Finn erstatter
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
