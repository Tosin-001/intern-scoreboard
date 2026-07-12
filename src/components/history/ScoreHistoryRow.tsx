"use client";

import type { ScoreHistoryEntry } from "@/lib/actions/scores";
import { timeAgo, formatFullDateTime } from "@/lib/utils/time";
import DeltaBadge from "./DeltaBadge";

interface ScoreHistoryRowProps {
  entry: ScoreHistoryEntry;
  /** "compact" = Scores page side panel. "card" = History page mobile view. */
  variant?: "compact" | "card";
}

export default function ScoreHistoryRow({ entry, variant = "compact" }: ScoreHistoryRowProps) {
  const updatedByLabel = entry.updatedBy ? "Admin" : "—";

  return (
    <div className={variant === "card" ? "card" : ""}>
      <div className={variant === "card" ? "card-body" : "d-flex justify-content-between align-items-start"}>
        <div className={variant === "card" ? "d-flex justify-content-between align-items-start" : ""}>
          <div>
            <div className="fw-medium small">{entry.internName}</div>
            <div className="text-muted-2" style={{ fontSize: "0.75rem" }}>
              {entry.oldScore} → {entry.newScore}
            </div>
            <div className="text-muted-2" style={{ fontSize: "0.7rem" }}>
              {timeAgo(entry.updatedAt)} · {formatFullDateTime(entry.updatedAt)}
            </div>
            {variant === "card" && (
              <div className="text-muted-2" style={{ fontSize: "0.7rem" }}>
                Updated by: {updatedByLabel}
              </div>
            )}
          </div>
          <DeltaBadge oldScore={entry.oldScore} newScore={entry.newScore} />
        </div>
      </div>
    </div>
  );
}
