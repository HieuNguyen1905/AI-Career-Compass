import React from "react";
import { getCurrentUser, makeGuestUser } from "@/lib/auth";
import { NavigationShell } from "@/components/navigation-shell";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const user = currentUser ?? makeGuestUser();

  return <NavigationShell user={user}>{children}</NavigationShell>;
}
