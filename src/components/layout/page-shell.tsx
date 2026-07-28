import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div
      className={cn(
        "min-h-0 w-full max-w-none flex-1 overflow-auto p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
