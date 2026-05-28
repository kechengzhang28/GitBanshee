import { useState } from "react";
import PanelHeader from "../PanelHeader";
import Button from "../ui/Button";
import { PanelRightClose, MessageSquare, FileSearch, MessageCircle, Bot } from "lucide-react";
import ActionChip from "./ActionChip";
import ChatView, { type ChatMessageData } from "./ChatView";
import ChatInput from "./ChatInput";

interface Props {
  open: boolean;
  onToggle: () => void;
}

type ViewMode = "idle" | "chat";

export default function AIPanel({ open, onToggle }: Props) {
  const [mode, setMode] = useState<ViewMode>("idle");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [streaming, setStreaming] = useState(false);

  if (!open) return null;

  const handleAction = (action: string) => {
    setMode("chat");
    setMessages([
      { role: "user", content: `Triggered: ${action}` },
    ]);
    setStreaming(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "_AI backend not yet implemented. This is placeholder text for the component library._" },
      ]);
      setStreaming(false);
    }, 800);
  };

  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "_AI backend not yet implemented. This is placeholder text._" },
      ]);
      setStreaming(false);
    }, 800);
  };

  const handleBack = () => {
    setMode("idle");
    setMessages([]);
  };

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-l border-gb-border bg-gb-panel">
      <PanelHeader
        title="AI"
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={PanelRightClose}
            onClick={onToggle}
            title="Close AI Panel"
          />
        }
      />
      {mode === "idle" ? (
        <>
          <div className="flex-1 p-3">
            <p className="mb-3 text-xs text-gb-text-muted">
              What would you like the AI to do?
            </p>
            <div className="flex flex-wrap gap-1.5">
              <ActionChip
                icon={MessageSquare}
                label="Msg"
                onClick={() => handleAction("Commit Message")}
              />
              <ActionChip
                icon={FileSearch}
                label="Review"
                onClick={() => handleAction("Code Review")}
              />
              <ActionChip
                icon={MessageCircle}
                label="Explain"
                onClick={() => handleAction("Explain")}
              />
              <ActionChip
                icon={Bot}
                label="Q&A"
                onClick={() => handleAction("Q&A")}
              />
            </div>
          </div>
          <ChatInput
            onSend={(text) => {
              setMode("chat");
              handleSend(text);
            }}
            placeholder="Or ask a question..."
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-1 border-b border-gb-border px-2 py-1">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              Back
            </Button>
          </div>
          <ChatView messages={messages} streaming={streaming} />
          <ChatInput onSend={handleSend} />
        </>
      )}
    </div>
  );
}
