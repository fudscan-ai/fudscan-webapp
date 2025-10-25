-- CreateTable
CREATE TABLE "public"."token_prices" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "token_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type_authority_id" TEXT NOT NULL,
    "content_type_type_id" TEXT NOT NULL,
    "content_type_version_major" INTEGER NOT NULL,
    "content_type_version_minor" INTEGER NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "delivery_status" TEXT NOT NULL,
    "sender_inbox_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "sent_at_ns" BIGINT NOT NULL,
    "kind" TEXT NOT NULL,
    "parameters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fallback" TEXT,
    "compression" TEXT,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outgoing_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_inbox_id" TEXT NOT NULL,
    "recipient_inbox_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "reference_message_id" TEXT,

    CONSTRAINT "outgoing_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "token_prices_symbol_idx" ON "public"."token_prices"("symbol");

-- CreateIndex
CREATE INDEX "token_prices_timestamp_idx" ON "public"."token_prices"("timestamp");

-- CreateIndex
CREATE INDEX "messages_conversation_id_sender_inbox_id_idx" ON "public"."messages"("conversation_id", "sender_inbox_id");

-- CreateIndex
CREATE INDEX "outgoing_messages_conversation_id_sender_inbox_id_idx" ON "public"."outgoing_messages"("conversation_id", "sender_inbox_id");

-- AddForeignKey
ALTER TABLE "public"."outgoing_messages" ADD CONSTRAINT "outgoing_messages_reference_message_id_fkey" FOREIGN KEY ("reference_message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
