import type { ReactNode } from "react";
import { classNames } from "../../utils/classNames";

type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "review";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
};

export function Badge({ children, tone = "neutral", icon, className }: BadgeProps) {
  return (
    <span className={classNames("badge", `badge--${tone}`, className)}>
      {icon ? <span className="badge__icon">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}
