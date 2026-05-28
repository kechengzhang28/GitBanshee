import type { ElementType, MouseEvent } from "react";

interface Props {
  icon: ElementType;
  size?: "sm" | "md";
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
};

export default function IconButton({
  icon: Icon,
  size = "md",
  onClick,
  title,
  className = "",
}: Props) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center rounded hover:bg-gb-hover ${sizeMap[size]} ${className}`}
    >
      <Icon size={size === "sm" ? 14 : 16} />
    </button>
  );
}
