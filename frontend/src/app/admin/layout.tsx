import { ReactNode } from "react";

import AuthHydrationBoundary from "@/components/AuthHydrationBoundary/AuthHydrationBoundary";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AuthHydrationBoundary>{children}</AuthHydrationBoundary>;
}
