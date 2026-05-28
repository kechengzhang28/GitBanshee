import ReactMarkdown from "react-markdown";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";

interface CodeProps {
  className?: string;
  children?: React.ReactNode;
}

function CodeRenderer({ className, children }: CodeProps) {
  const language = className?.replace("language-", "") || "";
  const code = String(children).replace(/\n$/, "");
  const grammar = language ? Prism.languages[language] : undefined;
  const highlighted = grammar
    ? Prism.highlight(code, grammar, language)
    : code;

  return (
    <pre className="my-1 overflow-x-auto rounded bg-gb-bg p-2 text-xs">
      <code
        className={className}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </pre>
  );
}

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function ChatMessage({
  role,
  content,
  streaming = false,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`mb-2 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-full rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-gb-accent/20 text-gb-text"
            : "bg-gb-input text-gb-text"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose-sm prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code: CodeRenderer,
              }}
            >
              {content}
            </ReactMarkdown>
            {streaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-gb-accent align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
