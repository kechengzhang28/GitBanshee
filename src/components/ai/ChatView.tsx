import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

export interface ChatMessageData {
  role: "user" | "assistant";
  content: string;
}

export interface ChatViewProps {
  messages: ChatMessageData[];
  streaming?: boolean;
  emptyText?: string;
}

export default function ChatView({
  messages,
  streaming = false,
  emptyText = "Select an action or ask a question",
}: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-xs text-gb-text-muted">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {messages.map((msg, i) => (
        <ChatMessage
          key={i}
          role={msg.role}
          content={msg.content}
          streaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
