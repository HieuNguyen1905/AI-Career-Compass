import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GuestProfile } from "@/components/guest-profile";
import { ProfileVectorSection } from "@/components/profile-vector-section";
import { hasCompletedCurrentAssessment } from "@/lib/assessment-status";
import { getCurrentUser, makeGuestUser } from "@/lib/auth";
import { getMyProfile, listCareerMatches } from "@/lib/data";

export const dynamic = "force-dynamic";


export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  const user = currentUser ?? makeGuestUser();

  if (!currentUser) {
    return (
      <AppShell
        user={user}
        active="/profile"
        title="Hồ sơ năng lực"
        description="Hồ sơ này chỉ tồn tại tạm thời. Vui lòng đăng nhập để có trải nghiệm lâu dài"
      >
        <GuestProfile />
      </AppShell>
    );
  }

  const profile = await getMyProfile();
  const assessmentReady = hasCompletedCurrentAssessment(profile);
  const readyProfile = assessmentReady && profile ? profile : null;
  const careerMatches = readyProfile ? await listCareerMatches() : [];
  const matches = careerMatches.slice(0, 3);
  const canShowMatches = matches.length > 0;

  return (
    <AppShell
      user={user}
      active="/profile"
      title="Hồ sơ năng lực"
      description="Xem tóm tắt hồ sơ từ bài đánh giá và các gợi ý nghề phù hợp."
    >
      <div className="mb-4 mt-6 flex items-center justify-between gap-3">
        <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Hồ sơ năng lực</h2>
      </div>
      {!readyProfile ? (
        <section className="relative my-6 overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/40 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Chưa có hồ sơ năng lực</h2>
              <p className="m-0 mt-2 leading-relaxed text-slate-600">Hãy làm bài đánh giá để hệ thống tạo hồ sơ năng lực và tính điểm phù hợp nghề nghiệp.</p>
            </div>
            <Link className="btn btn-primary shrink-0" href="/assessment">
              Làm bài đánh giá
            </Link>
          </div>
        </section>
      ) : (
        <>
          <ProfileVectorSection profile={readyProfile} />

          {canShowMatches ? (
            <>
              <div className="mb-4 mt-8 flex items-center justify-between gap-3">
                <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Top gợi ý từ hồ sơ này</h2>
                <Link className="btn btn-secondary btn-sm" href="/explore">
                  Xem kết quả đầy đủ
                </Link>
              </div>
              <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {matches.map((match) => (
                  <article className="card card-hover grid gap-3.5 p-5" key={match.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="chip-slate mb-1.5">{match.cluster}</span>
                        <h3 className="m-0 font-display font-bold leading-tight tracking-tight text-slate-900">{match.title}</h3>
                      </div>
                      <div
                        className="ring-score h-[58px] w-[58px] text-sm"
                        style={{ background: `radial-gradient(circle at center, #fff 58%, transparent 60%), conic-gradient(#0d9488 ${match.score}%, #e2e8f0 0)` }}
                      >
                        {match.score}
                      </div>
                    </div>
                    <p className="m-0 text-sm leading-relaxed text-slate-500">{match.reasons[0]}</p>
                    <Link className="btn btn-secondary btn-sm mt-auto" href={`/careers/${match.id}`}>
                      Mở chi tiết nghề
                    </Link>
                  </article>
                ))}
              </section>
            </>
          ) : null}
          <div className="mt-6 mb-4">
            <Link className="btn btn-secondary" href="/assessment">
              Làm lại bài đánh giá
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}
