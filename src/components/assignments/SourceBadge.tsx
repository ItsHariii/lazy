import {
  BookOpen,
  Cloud,
  FileText,
  GraduationCap,
  MousePointer2,
  PenLine,
} from "lucide-react";
import type { AssignmentSource } from "../../types/assignment";
import { sourceLabel } from "../../utils/confidence";
import { Badge } from "../ui/Badge";

type SourceBadgeProps = {
  source: AssignmentSource;
};

const sourceIcons = {
  canvas: Cloud,
  brightspace: GraduationCap,
  mcgraw_hill: BookOpen,
  syllabus: FileText,
  browser_helper: MousePointer2,
  manual: PenLine,
};

export function SourceBadge({ source }: SourceBadgeProps) {
  const Icon = sourceIcons[source];

  return (
    <Badge icon={<Icon aria-hidden="true" size={14} />} tone="neutral">
      {sourceLabel(source)}
    </Badge>
  );
}
