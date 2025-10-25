-- AlterTable
ALTER TABLE "public"."documents" ADD COLUMN     "md5sum" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "documents_md5sum_idx" ON "public"."documents"("md5sum");
