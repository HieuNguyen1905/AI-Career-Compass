CREATE TABLE "CareerMatchExplanation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "careerIdsHash" TEXT NOT NULL,
    "matchesJson" JSONB NOT NULL,
    "explanationsJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerMatchExplanation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerMatchExplanation_userId_assessmentHash_model_promptVe_key"
ON "CareerMatchExplanation"("userId", "assessmentHash", "model", "promptVersion", "careerIdsHash");

CREATE INDEX "CareerMatchExplanation_userId_assessmentHash_idx"
ON "CareerMatchExplanation"("userId", "assessmentHash");

ALTER TABLE "CareerMatchExplanation"
ADD CONSTRAINT "CareerMatchExplanation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
