import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "../../utils/classNames";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  active?: boolean;
};

export function IconButton({
  icon,
  label,
  className,
  active,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={classNames("icon-button", active && "is-active", className)}
      title={label}
      type={type}
      {...props}
    >
      {icon}
    </button>
  );
}
