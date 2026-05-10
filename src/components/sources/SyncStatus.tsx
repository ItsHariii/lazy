import { AlertCircle, CheckCircle2, MinusCircle, RotateCw } from "lucide-react";
import type { SourceConnectionStatus } from "../../types/source";
import { sourceStatusLabel } from "../../utils/confidence";
import { Badge } from "../ui/Badge";

type SyncStatusProps = {
  status: SourceConnectionStatus;
};

export function SyncStatus({ status }: SyncStatusProps) {
  const Icon =
    status === "connected"
      ? CheckCircle2
      : status === "syncing"
        ? RotateCw
        : status === "error"
          ? AlertCircle
          : MinusCircle;
  const tone =
    status === "connected"
      ? "success"
      : status === "syncing"
        ? "info"
        : status === "error"
          ? "danger"
          : "neutral";

  return (
    <Badge icon={<Icon aria-hidden="true" size={14} />} tone={tone}>
      {sourceStatusLabel(status)}
    </Badge>
  );
}
