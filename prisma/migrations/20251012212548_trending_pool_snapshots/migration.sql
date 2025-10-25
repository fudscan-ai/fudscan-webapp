-- CreateTable
CREATE TABLE "trending_pool_snapshots" (
    "id" SERIAL NOT NULL,
    "chain_key" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetched_at" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trending_pool_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trending_pool_snapshots_chain_key_fetched_at_idx" ON "trending_pool_snapshots"("chain_key", "fetched_at");
