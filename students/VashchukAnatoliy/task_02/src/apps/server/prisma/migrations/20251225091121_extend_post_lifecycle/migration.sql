/*
  Warnings:

  - Made the column `updated_at` on table `posts` required. This step will fail if there are existing NULL values in that column.

*/

-- AlterTable
ALTER TABLE "public"."posts"
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active'
    CHECK ("status" IN ('active', 'hidden', 'archived')),
ALTER COLUMN "updated_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "posts_status_idx"
ON "public"."posts"("status");
