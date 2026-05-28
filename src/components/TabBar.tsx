import { useRepoStore } from "../stores/repoStore";
import IconButton from "./IconButton";
import { Plus, HelpCircle } from "lucide-react";

export default function TabBar() {
  const path = useRepoStore((s) => s.path);
  if (!path) return null;

  const name = path.split(/[/\\]/).pop() || path;

  return (
    <div className="flex h-9 items-center border-b border-gb-border bg-gb-toolbar px-3" data-tauri-drag-region>
      <span className="text-xs font-medium text-gb-accent">{name}</span>
      <IconButton icon={Plus} size="sm" className="ml-2 text-gb-text-muted" />
      <div className="flex-1" />
      <IconButton icon={HelpCircle} size="sm" className="text-gb-text-muted" />
    </div>
  );
}
