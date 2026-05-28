export interface SpinnerProps {
  size?: "sm" | "md";
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: "h-3.5 w-3.5 border-2",
  md: "h-5 w-5 border-2",
};

export default function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-gb-border border-t-gb-accent ${sizeMap[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
