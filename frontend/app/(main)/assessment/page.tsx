import { AssessmentForm } from "@/components/assessment-form";
import { AppShell } from "@/components/app-shell";
import { assessmentQuestions } from "@/lib/assessment-questions";
import { getCurrentUser, makeGuestUser } from "@/lib/auth";
import { getMyProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const currentUser = await getCurrentUser();
  const user = currentUser ?? makeGuestUser();
  const profile = currentUser ? await getMyProfile() : null;

  return (
    <AppShell
      user={user}
      active="/assessment"
      title="Hồ sơ năng lực"
      description="Cập nhật thông tin học tập, sở thích và ưu tiên nghề nghiệp."
    >
      <AssessmentForm
        user={{
          email: user.email,
          name: user.name,
          gradeLevel: user.gradeLevel,
          gender: user.gender
        }}
        isGuest={!currentUser}
        profile={
          profile
            ? {
              gradeLevel: profile.gradeLevel,
              goals: profile.goals,
              constraints: profile.constraints,
              assessmentAnswers: profile.assessmentAnswers
            }
            : null
        }
        questions={assessmentQuestions.map((question) => ({
          id: question.id,
          step: question.step,
          prompt: question.prompt
        }))}
      />
    </AppShell>
  );
}
