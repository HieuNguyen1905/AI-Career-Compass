import "server-only";

import { assessmentQuestions } from "@/lib/assessment-questions";
import type { CareerProfile } from "@/lib/types";

export function hasCompletedCurrentAssessment(profile: CareerProfile | null | undefined) {
  const answers = profile?.assessmentAnswers;
  if (!profile?.assessmentCompleted || !answers) return false;

  let hasNonNeutralAnswer = false;
  const hasAllCurrentAnswers = assessmentQuestions.every((question) => {
    const score = answers[question.id];
    const isValid = Number.isInteger(score) && score >= 1 && score <= 5;
    if (isValid && score !== 3) hasNonNeutralAnswer = true;
    return isValid;
  });

  return hasAllCurrentAnswers && hasNonNeutralAnswer;
}
