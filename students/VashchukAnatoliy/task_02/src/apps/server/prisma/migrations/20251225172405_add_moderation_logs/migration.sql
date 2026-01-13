-- CreateTable
CREATE TABLE "public"."moderation_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderator_id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,

    CONSTRAINT "moderation_logs_action_check"
        CHECK ("action" IN ('hide_post', 'archive_post', 'ignore_report')),

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_logs_moderator_id_created_at_idx"
ON "public"."moderation_logs"("moderator_id", "created_at");

-- CreateIndex
CREATE INDEX "moderation_logs_report_id_idx"
ON "public"."moderation_logs"("report_id");

-- AddForeignKey
ALTER TABLE "public"."moderation_logs"
ADD CONSTRAINT "moderation_logs_moderator_id_fkey"
FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_logs"
ADD CONSTRAINT "moderation_logs_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_logs"
ADD CONSTRAINT "moderation_logs_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
