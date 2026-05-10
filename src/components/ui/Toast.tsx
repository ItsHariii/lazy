import { CheckCircle2 } from "lucide-react";

type ToastProps = {
  message: string;
};

export function Toast({ message }: ToastProps) {
  return (
    <div className="toast" role="status">
      <CheckCircle2 aria-hidden="true" size={17} />
      <span>{message}</span>
    </div>
  );
}
