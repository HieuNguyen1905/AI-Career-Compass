DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CareerPath' AND column_name = 'skills'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CareerPath' AND column_name = 'jobSkills'
  ) THEN
    ALTER TABLE "CareerPath" RENAME COLUMN "skills" TO "jobSkills";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CareerPath' AND column_name = 'tasks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CareerPath' AND column_name = 'jobTasks'
  ) THEN
    ALTER TABLE "CareerPath" RENAME COLUMN "tasks" TO "jobTasks";
  END IF;
END $$;

ALTER TABLE "CareerPath"
  ADD COLUMN IF NOT EXISTS "jobSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "jobTasks" TEXT[] DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CareerPath' AND column_name = 'skills'
  ) THEN
    UPDATE "CareerPath"
    SET "jobSkills" = "skills"
    WHERE ("jobSkills" IS NULL OR cardinality("jobSkills") = 0)
      AND "skills" IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CareerPath' AND column_name = 'tasks'
  ) THEN
    UPDATE "CareerPath"
    SET "jobTasks" = "tasks"
    WHERE ("jobTasks" IS NULL OR cardinality("jobTasks") = 0)
      AND "tasks" IS NOT NULL;
  END IF;
END $$;

UPDATE "CareerPath" SET "jobSkills" = ARRAY[]::TEXT[] WHERE "jobSkills" IS NULL;
UPDATE "CareerPath" SET "jobTasks" = ARRAY[]::TEXT[] WHERE "jobTasks" IS NULL;

DROP INDEX IF EXISTS "CareerPath_careerMatrixId_key";

ALTER TABLE "CareerPath"
  DROP COLUMN IF EXISTS "skills",
  DROP COLUMN IF EXISTS "tasks",
  DROP COLUMN IF EXISTS "interests",
  DROP COLUMN IF EXISTS "roadmap",
  DROP COLUMN IF EXISTS "values",
  DROP COLUMN IF EXISTS "riasec",
  DROP COLUMN IF EXISTS "RIASEC",
  DROP COLUMN IF EXISTS "careerMatrixId";

ALTER TABLE "CareerPath"
  ALTER COLUMN "jobSkills" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "jobSkills" SET NOT NULL,
  ALTER COLUMN "jobTasks" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "jobTasks" SET NOT NULL;
