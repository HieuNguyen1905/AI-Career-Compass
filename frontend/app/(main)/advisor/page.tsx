import { AdvisorChat } from "@/components/advisor-chat";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser, makeGuestUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  const currentUser = await getCurrentUser();
  const user = currentUser ?? makeGuestUser();

  return (
    <AppShell
      user={user}
      active="/advisor"
      title="AI Career Coach"
      description="Chat với AI Career Coach để khám phá ngành nghề và lộ trình học tập phù hợp."
    >
      <AdvisorChat isGuest={!currentUser} />
    </AppShell>
  );
}
