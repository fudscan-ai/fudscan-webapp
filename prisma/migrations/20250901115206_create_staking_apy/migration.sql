-- CreateTable
CREATE TABLE "public"."staking_apy" (
    "id" SERIAL NOT NULL,
    "total_apy" DECIMAL(10,6) NOT NULL,
    "base_apy" DECIMAL(10,6) NOT NULL,
    "rewards_apy" DECIMAL(10,6) NOT NULL,
    "rewards" JSONB,
    "timestamp" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staking_apy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staking_apy_timestamp_idx" ON "public"."staking_apy"("timestamp");
