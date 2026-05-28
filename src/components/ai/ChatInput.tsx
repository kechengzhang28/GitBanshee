import { useState, useRef, type KeyboardEvent } from "react";
import Button from "../ui/Button";
import { Send } from "lucide-react";

export interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask about this repository...",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-1.5 border-t border-gb-border p-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded bg-gb-input px-2 py-1.5 text-xs text-gb-text placeholder-gb-text-muted outline-none transition-colors focus:ring-1 focus:ring-gb-accent disabled:opacity-50"
      />
      <Button
        variant="ghost"
        size="sm"
        icon={Send}
        onClick={handleSend}
        disabled={disabled || !text.trim()}
      />
    </div>
  );
}
