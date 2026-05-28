import type { ElementType, MouseEvent, ReactNode } from "react";
import Spinner from "./Spinner";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  icon?: ElementType;
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  title?: string;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-gb-accent text-white hover:brightness-110 disabled:opacity-50",
  secondary:
    "bg-gb-input text-gb-text border border-gb-border hover:bg-gb-hover disabled:opacity-50",
  ghost:
    "text-gb-text-sec hover:bg-gb-hover hover:text-gb-text disabled:opacity-50",
};

export default function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  loading = false,
  disabled = false,
  children,
  onClick,
  className = "",
  title,
}: ButtonProps) {
  const isIconOnly = !children && !!Icon;
  const sizeClass = isIconOnly
    ? size === "sm"
      ? "h-7 w-7"
      : "h-8 w-8"
    : size === "sm"
      ? "h-7 px-2 text-xs gap-1"
      : "h-8 px-3 text-sm gap-1.5";

  const iconSize = size === "sm" ? 12 : 14;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`inline-flex items-center justify-center rounded font-medium transition-colors ${variantStyles[variant]} ${sizeClass} ${className}`}
    >
      {loading ? (
        <Spinner size={size} />
      ) : Icon ? (
        <Icon size={iconSize} />
      ) : null}
      {children}
    </button>
  );
}
