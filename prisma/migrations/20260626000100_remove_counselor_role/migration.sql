-- Keep only ADMIN and STUDENT roles.
-- Existing non-admin accounts become STUDENT accounts.

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'STUDENT');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (
    CASE
      WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::"Role_new"
      ELSE 'STUDENT'::"Role_new"
    END
  );

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STUDENT'::"Role";
