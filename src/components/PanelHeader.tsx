import type { ReactNode } from "react";

interface Props {
  title: string;
  actions?: ReactNode;
}

export default function PanelHeader({ title, actions }: Props) {
  return (
    <div className="flex h-8 items-center border-b border-gb-border bg-gb-panel px-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-gb-text-sec">
        {title}
      </span>
      {actions && (
        <>
          <div className="flex-1" />
          {actions}
        </>
      )}
    </div>
  );
}
