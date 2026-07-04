import type { CareerPath, CareerProfile } from "@/lib/types";

type ProfileInput = Pick<
  CareerProfile,
  "interests" | "strengths" | "favoriteSubjects" | "values" | "goals" | "constraints"
> | null;

type CareerInput = CareerPath;

export type CareerMatch = CareerInput & {
  score: number;
  reasons: string[];
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Ä‘/g, "d");
}

function overlapRatio(source: string[], target: string[]) {
  if (source.length === 0 || target.length === 0) return 0;
  const sourceSet = new Set(source.map(normalize));
  const hits = target.filter((item) => sourceSet.has(normalize(item))).length;
  return hits / Math.max(1, Math.min(source.length, target.length));
}

function countMatches(source: string[], target: string[]) {
  const sourceSet = new Set(source.map(normalize));
  return target.filter((item) => sourceSet.has(normalize(item))).length;
}

function textHits(text: string, target: string[]) {
  const normalizedText = normalize(text);
  return target.filter((item) => normalizedText.includes(normalize(item))).length;
}

export function getCareerMatches(profile: ProfileInput, careers: CareerInput[]): CareerMatch[] {
  if (!profile) {
    return careers.slice(0, 5).map((career) => ({
      ...career,
      score: 50,
      reasons: ["Cần làm assessment để cá nhân hóa điểm phù hợp và lý do gợi ý."]
    }));
  }

  const profileText = `${profile.goals} ${profile.constraints}`;

  return careers
    .map((career) => {
      const subjectScore = overlapRatio(profile.favoriteSubjects, career.subjects);
      const skillScore = overlapRatio(profile.strengths, career.jobSkills);
      const majorSource = [...profile.interests, ...profile.values];
      const majorScore = overlapRatio(majorSource, career.majors);
      const goalBoost = Math.min(0.12, textHits(profileText, career.majors) * 0.04);

      const weightedScore = 0.42 * subjectScore + 0.38 * skillScore + 0.2 * majorScore + goalBoost;
      const score = Math.max(48, Math.min(98, Math.round(48 + weightedScore * 50)));

      const subjectHits = countMatches(profile.favoriteSubjects, career.subjects);
      const skillHits = countMatches(profile.strengths, career.jobSkills);
      const majorHits = countMatches(majorSource, career.majors);

      const reasons = [
        subjectHits > 0
          ? `Khớp ${subjectHits} môn học liên quan: ${career.subjects
              .filter((subject) => profile.favoriteSubjects.map(normalize).includes(normalize(subject)))
              .join(", ")}.`
          : "Môn học liên quan chưa khớp mạnh, nên thử hoạt động nhỏ để kiểm chứng.",
        skillHits > 0 ? `Khớp ${skillHits} kỹ năng nghề nghiệp.` : "Cần thêm dữ liệu về kỹ năng để gợi ý chắc hơn.",
        majorHits > 0
          ? "Ngành học phù hợp có điểm giao với sở thích hoặc giá trị của em."
          : "Nên xem ngành học liên quan và thử một hoạt động trải nghiệm."
      ];

      return {
        ...career,
        score,
        reasons
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
