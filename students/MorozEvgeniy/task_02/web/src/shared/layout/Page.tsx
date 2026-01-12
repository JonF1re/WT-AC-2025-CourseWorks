import type { ReactNode } from "react";

export function Page({ children }: { children: ReactNode }) {
  return <div className="page">{children}</div>;
}
