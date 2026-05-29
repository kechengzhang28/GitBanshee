export default function DiffSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden animate-pulse">
      <div className="shrink-0 border-b border-gb-border bg-gb-toolbar px-3 py-2">
        <div className="h-4 w-48 rounded bg-gb-text/10" />
      </div>
      <div className="flex-1 overflow-hidden font-mono text-xs leading-[20px]">
        {Array.from({ length: 20 }).map((_, i) => {
          const w = [40, 60, 30, 80, 55, 70, 45, 90, 35, 65][i % 10];
          const isAdd = i % 5 === 2;
          const isDel = i % 7 === 3;
          return (
            <div
              key={i}
              className={`flex h-[20px] items-center px-3 ${
                isAdd ? "bg-gb-success/5" : isDel ? "bg-gb-danger/5" : ""
              }`}
            >
              <span className="inline-block w-12 shrink-0 pr-2 text-right">
                <span className="inline-block h-3 w-6 rounded bg-gb-text/10" />
              </span>
              <span className="inline-block w-12 shrink-0 pr-2 text-right">
                <span className="inline-block h-3 w-6 rounded bg-gb-text/10" />
              </span>
              <span className="w-4 shrink-0 text-center">
                <span className="inline-block h-3 w-2 rounded bg-gb-text/10" />
              </span>
              <span
                className="inline-block h-3 rounded bg-gb-text/10"
                style={{ width: `${w * 3}px` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
