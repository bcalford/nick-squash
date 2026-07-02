import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-cobalt-soft text-cobalt [&>svg]:size-8">
        {icon}
      </div>
      <h3 className="text-[17px] font-bold">{title}</h3>
      <p className="max-w-[280px] text-[15px] leading-snug text-ink-2">{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
