import type { ReactNode } from "react";

export interface BadgeProps {
  variant?: "default" | "success" | "danger" | "warning";
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-gb-input text-gb-text-sec",
  success: "bg-gb-success/20 text-gb-success",
  danger: "bg-gb-danger/20 text-gb-danger",
  warning: "bg-gb-warning/20 text-gb-warning",
};

export default function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
