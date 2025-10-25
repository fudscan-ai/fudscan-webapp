-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "instructions" TEXT;

-- CreateTable
CREATE TABLE "api_tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "endpoint" TEXT,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "parameters" JSONB,
    "scopes" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_external" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "session_id" TEXT,
    "query" TEXT NOT NULL,
    "intent" TEXT,
    "workflow" JSONB,
    "response" TEXT,
    "tools_used" TEXT[],
    "rag_used" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "step_type" TEXT NOT NULL,
    "step_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "order" INTEGER NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ApiToolToClient" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApiToolToClient_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_tools_name_key" ON "api_tools"("name");

-- CreateIndex
CREATE INDEX "api_tools_category_idx" ON "api_tools"("category");

-- CreateIndex
CREATE INDEX "api_tools_is_active_idx" ON "api_tools"("is_active");

-- CreateIndex
CREATE INDEX "conversations_client_id_idx" ON "conversations"("client_id");

-- CreateIndex
CREATE INDEX "conversations_created_at_idx" ON "conversations"("created_at");

-- CreateIndex
CREATE INDEX "workflow_steps_conversation_id_order_idx" ON "workflow_steps"("conversation_id", "order");

-- CreateIndex
CREATE INDEX "_ApiToolToClient_B_index" ON "_ApiToolToClient"("B");

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApiToolToClient" ADD CONSTRAINT "_ApiToolToClient_A_fkey" FOREIGN KEY ("A") REFERENCES "api_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApiToolToClient" ADD CONSTRAINT "_ApiToolToClient_B_fkey" FOREIGN KEY ("B") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
