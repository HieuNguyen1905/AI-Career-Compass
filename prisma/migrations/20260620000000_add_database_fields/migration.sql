-- Add fields required by the Supabase-backed application data layer.

ALTER TABLE "User" ADD COLUMN "gradeLevel" TEXT;

ALTER TABLE "CareerProfile" ADD COLUMN "values" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CareerProfile" ADD COLUMN "assessmentCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CareerProfile" ADD COLUMN "assessmentAnswers" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "CareerPath" ADD COLUMN "values" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CareerPath" ADD COLUMN "tasks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CareerPath" ADD COLUMN "roadmap" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
