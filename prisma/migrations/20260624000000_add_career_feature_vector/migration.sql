-- Store numeric career feature vectors from career_matrix.xlsx in Supabase/Postgres.
-- The vector is centered from the Excel 1..5 scale to [-1, 1] before storage.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "CareerPath"
  ADD COLUMN IF NOT EXISTS "careerMatrixId" TEXT,
  ADD COLUMN IF NOT EXISTS "onetCode" TEXT,
  ADD COLUMN IF NOT EXISTS "featureVector" vector(16),
  ADD COLUMN IF NOT EXISTS "featureVectorVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "featureVectorUpdatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "CareerPath_careerMatrixId_key"
  ON "CareerPath"("careerMatrixId");

CREATE UNIQUE INDEX IF NOT EXISTS "CareerPath_onetCode_key"
  ON "CareerPath"("onetCode");

CREATE INDEX IF NOT EXISTS "CareerPath_featureVector_cosine_idx"
  ON "CareerPath"
  USING ivfflat ("featureVector" vector_cosine_ops)
  WITH (lists = 10);
