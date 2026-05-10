import { AlertTriangle, CheckCircle2, CircleHelp } from "lucide-react";
import type { AssignmentConfidence } from "../../types/assignment";
import { confidenceLabel } from "../../utils/confidence";
import { Badge } from "../ui/Badge";

type ConfidenceBadgeProps = {
  confidence: AssignmentConfidence;
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const tone =
    confidence === "confirmed"
      ? "success"
      : confidence === "probable"
        ? "warning"
        : "review";
  const Icon =
    confidence === "confirmed"
      ? CheckCircle2
      : confidence === "probable"
        ? CircleHelp
        : AlertTriangle;

  return (
    <Badge icon={<Icon aria-hidden="true" size={14} />} tone={tone}>
      {confidenceLabel(confidence)}
    </Badge>
  );
}
