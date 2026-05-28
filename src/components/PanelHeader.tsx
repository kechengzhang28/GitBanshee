import type { ReactNode } from "react";

interface Props {
  title: string;
  actions?: ReactNode;
}

export default function PanelHeader({ title, actions }: Props) {
  return (
    <div className="flex h-8 items-center border-b border-gb-border px-3">
      <span className="text-xs font-semibold text-gb-text">{title}</span>
      {actions && (
        <>
          <div className="flex-1" />
          {actions}
        </>
      )}
    </div>
  );
}
