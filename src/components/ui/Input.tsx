import type { ChangeEvent } from "react";

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export default function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  error,
  className = "",
}: InputProps) {
  return (
    <div className={className}>
      <input
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded bg-gb-input px-2.5 py-1.5 text-sm text-gb-text placeholder-gb-text-muted outline-none transition-colors focus:ring-1 focus:ring-gb-accent disabled:opacity-50 ${
          error ? "ring-1 ring-gb-danger" : ""
        }`}
      />
      {error && <p className="mt-1 text-xs text-gb-danger">{error}</p>}
    </div>
  );
}
