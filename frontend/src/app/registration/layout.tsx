import { ReactNode } from "react";

import AuthHydrationBoundary from "@/components/AuthHydrationBoundary/AuthHydrationBoundary";

export default function RegistrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthHydrationBoundary>{children}</AuthHydrationBoundary>;
}
