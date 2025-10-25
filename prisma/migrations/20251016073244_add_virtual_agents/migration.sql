-- CreateTable
CREATE TABLE "virtual_agents" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gross_agentic_amount" DECIMAL(18,8),
    "created_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "owner_address" TEXT,
    "profile_pic" TEXT,
    "success_rate" DECIMAL(10,4),
    "successful_job_count" INTEGER,
    "token_address" TEXT,
    "transaction_count" INTEGER,
    "twitter_handle" TEXT,
    "unique_buyer_count" INTEGER,
    "virtual_agent_id" TEXT,
    "wallet_address" TEXT,
    "wallet_balance" DECIMAL(18,8),
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_agents_spotlight" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "cluster" TEXT,
    "description" TEXT,
    "gross_agentic_amount" DECIMAL(18,8),
    "metrics" JSONB,
    "owner_address" TEXT,
    "profile_pic" TEXT,
    "role" TEXT,
    "token_address" TEXT,
    "twitter_handle" TEXT,
    "virtual_agent_id" TEXT,
    "wallet_address" TEXT,
    "wallet_balance" DECIMAL(18,8),
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_agents_spotlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_trending" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "cores" JSONB,
    "chain" TEXT,
    "dao_address" TEXT,
    "description" TEXT,
    "dev_holding_percentage" DECIMAL(10,4),
    "factory" TEXT,
    "holder_count" INTEGER,
    "holder_count_percent_24h" DECIMAL(10,4),
    "image" JSONB,
    "liquidity_usd" DECIMAL(18,8),
    "lp_address" TEXT,
    "mcap_in_virtual" DECIMAL(18,8),
    "net_volume_24h" DECIMAL(18,8),
    "pre_token" TEXT,
    "pre_token_pair" TEXT,
    "price_change_percent_24h" DECIMAL(10,4),
    "revenue_connect_wallet" TEXT,
    "role" TEXT,
    "status" TEXT,
    "tba_address" TEXT,
    "token_address" TEXT,
    "top10_holder_percentage" DECIMAL(10,4),
    "total_supply" BIGINT,
    "total_value_locked" TEXT,
    "ve_token_address" TEXT,
    "volume_24h" DECIMAL(18,8),
    "virtual_id" TEXT,
    "virtual_token_value" TEXT,
    "wallet_address" TEXT,
    "image_url" TEXT,
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_trending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_fundamentals" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "cores" JSONB,
    "chain" TEXT,
    "dao_address" TEXT,
    "description" TEXT,
    "dev_holding_percentage" DECIMAL(10,4),
    "factory" TEXT,
    "holder_count" INTEGER,
    "holder_count_percent_24h" DECIMAL(10,4),
    "image" JSONB,
    "liquidity_usd" DECIMAL(18,8),
    "lp_address" TEXT,
    "mcap_in_virtual" DECIMAL(18,8),
    "net_volume_24h" DECIMAL(18,8),
    "pre_token" TEXT,
    "pre_token_pair" TEXT,
    "price_change_percent_24h" DECIMAL(10,4),
    "revenue_connect_wallet" TEXT,
    "role" TEXT,
    "status" TEXT,
    "tba_address" TEXT,
    "token_address" TEXT,
    "top10_holder_percentage" DECIMAL(10,4),
    "total_supply" BIGINT,
    "total_value_locked" TEXT,
    "ve_token_address" TEXT,
    "volume_24h" DECIMAL(18,8),
    "virtual_id" TEXT,
    "virtual_token_value" TEXT,
    "wallet_address" TEXT,
    "image_url" TEXT,
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_fundamentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_yield_apy" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "chain" TEXT,
    "image" JSONB,
    "status" TEXT,
    "token_address" TEXT,
    "virtual_token_value" TEXT,
    "image_url" TEXT,
    "genesis_id" INTEGER,
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_yield_apy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_upcoming_agents" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "cores" JSONB,
    "chain" TEXT,
    "description" TEXT,
    "dev_holding_percentage" DECIMAL(10,4),
    "factory" TEXT,
    "holder_count" INTEGER,
    "holder_count_percent_24h" DECIMAL(10,4),
    "image" JSONB,
    "liquidity_usd" DECIMAL(18,8),
    "net_volume_24h" DECIMAL(18,8),
    "pre_token" TEXT,
    "pre_token_pair" TEXT,
    "price_change_percent_24h" DECIMAL(10,4),
    "role" TEXT,
    "status" TEXT,
    "top10_holder_percentage" DECIMAL(10,4),
    "volume_24h" DECIMAL(18,8),
    "wallet_address" TEXT,
    "image_url" TEXT,
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_upcoming_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "virtual_agents_virtual_agent_id_idx" ON "virtual_agents"("virtual_agent_id");

-- CreateIndex
CREATE INDEX "virtual_agents_name_idx" ON "virtual_agents"("name");

-- CreateIndex
CREATE INDEX "virtual_agents_scraped_at_idx" ON "virtual_agents"("scraped_at");

-- CreateIndex
CREATE INDEX "virtual_agents_spotlight_virtual_agent_id_idx" ON "virtual_agents_spotlight"("virtual_agent_id");

-- CreateIndex
CREATE INDEX "virtual_agents_spotlight_name_idx" ON "virtual_agents_spotlight"("name");

-- CreateIndex
CREATE INDEX "virtual_agents_spotlight_category_idx" ON "virtual_agents_spotlight"("category");

-- CreateIndex
CREATE INDEX "virtual_agents_spotlight_scraped_at_idx" ON "virtual_agents_spotlight"("scraped_at");

-- CreateIndex
CREATE INDEX "virtual_trending_virtual_id_idx" ON "virtual_trending"("virtual_id");

-- CreateIndex
CREATE INDEX "virtual_trending_name_idx" ON "virtual_trending"("name");

-- CreateIndex
CREATE INDEX "virtual_trending_volume_24h_idx" ON "virtual_trending"("volume_24h");

-- CreateIndex
CREATE INDEX "virtual_trending_chain_idx" ON "virtual_trending"("chain");

-- CreateIndex
CREATE INDEX "virtual_trending_scraped_at_idx" ON "virtual_trending"("scraped_at");

-- CreateIndex
CREATE INDEX "virtual_fundamentals_virtual_id_idx" ON "virtual_fundamentals"("virtual_id");

-- CreateIndex
CREATE INDEX "virtual_fundamentals_name_idx" ON "virtual_fundamentals"("name");

-- CreateIndex
CREATE INDEX "virtual_fundamentals_chain_idx" ON "virtual_fundamentals"("chain");

-- CreateIndex
CREATE INDEX "virtual_fundamentals_scraped_at_idx" ON "virtual_fundamentals"("scraped_at");

-- CreateIndex
CREATE INDEX "virtual_yield_apy_name_idx" ON "virtual_yield_apy"("name");

-- CreateIndex
CREATE INDEX "virtual_yield_apy_chain_idx" ON "virtual_yield_apy"("chain");

-- CreateIndex
CREATE INDEX "virtual_yield_apy_genesis_id_idx" ON "virtual_yield_apy"("genesis_id");

-- CreateIndex
CREATE INDEX "virtual_yield_apy_scraped_at_idx" ON "virtual_yield_apy"("scraped_at");

-- CreateIndex
CREATE INDEX "virtual_upcoming_agents_name_idx" ON "virtual_upcoming_agents"("name");

-- CreateIndex
CREATE INDEX "virtual_upcoming_agents_chain_idx" ON "virtual_upcoming_agents"("chain");

-- CreateIndex
CREATE INDEX "virtual_upcoming_agents_status_idx" ON "virtual_upcoming_agents"("status");

-- CreateIndex
CREATE INDEX "virtual_upcoming_agents_scraped_at_idx" ON "virtual_upcoming_agents"("scraped_at");
