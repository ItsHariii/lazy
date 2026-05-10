import { BookOpen, FileText, MousePointer2, PenLine, RotateCw, Unplug } from "lucide-react";
import type { SourceConnection } from "../../types/source";
import { formatRelativeSync } from "../../utils/formatDueDate";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SyncStatus } from "./SyncStatus";

type SourceConnectionCardProps = {
  source: SourceConnection;
  onSync: (sourceId: string) => void;
  onToggle: (sourceId: string) => void;
};

function SourceIcon({ type }: { type: SourceConnection["type"] }) {
  const Icon =
    type === "syllabus"
      ? FileText
      : type === "browser_helper"
        ? MousePointer2
        : type === "manual"
          ? PenLine
          : BookOpen;

  return <Icon aria-hidden="true" size={20} />;
}

export function SourceConnectionCard({
  source,
  onSync,
  onToggle,
}: SourceConnectionCardProps) {
  return (
    <Card className="source-card">
      <div className="source-card__header">
        <div className="source-card__icon">
          <SourceIcon type={source.type} />
        </div>
        <div>
          <h3>{source.name}</h3>
          <p>Last sync {formatRelativeSync(source.lastSyncedAt)}</p>
        </div>
        <SyncStatus status={source.status} />
      </div>

      {source.errorMessage ? (
        <p className="source-card__error">{source.errorMessage}</p>
      ) : null}

      <div className="permission-list" aria-label={`${source.name} permissions`}>
        {(source.permissions ?? ["No permissions requested"]).map((permission) => (
          <span key={permission}>{permission}</span>
        ))}
      </div>

      <div className="source-card__actions">
        <Button
          disabled={source.status === "disabled"}
          icon={<RotateCw size={16} />}
          onClick={() => onSync(source.id)}
          size="sm"
        >
          Sync
        </Button>
        <Button
          icon={<Unplug size={16} />}
          onClick={() => onToggle(source.id)}
          size="sm"
          variant="ghost"
        >
          {source.status === "disabled" ? "Enable" : "Disable"}
        </Button>
      </div>
    </Card>
  );
}
