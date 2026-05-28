import type { ReactNode } from "react";

interface Props<T> {
  items: T[];
  rowHeight: number;
  scrollTop: number;
  visibleRows: number;
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
}

export default function VirtualList<T>({
  items,
  rowHeight,
  scrollTop,
  visibleRows,
  renderItem,
  getKey,
}: Props<T>) {
  const firstRow = Math.floor(scrollTop / rowHeight);
  const lastRow = Math.min(firstRow + visibleRows + 1, items.length);

  const elements: ReactNode[] = [];

  for (let i = firstRow; i < lastRow; i++) {
    const item = items[i];
    if (item === undefined) continue;
    elements.push(
      <div
        key={getKey(item, i)}
        className="absolute left-0"
        style={{ top: i * rowHeight - scrollTop, height: rowHeight, width: "100%" }}
      >
        {renderItem(item, i)}
      </div>,
    );
  }

  return (
    <div className="relative" style={{ height: items.length * rowHeight }}>
      {elements}
    </div>
  );
}
