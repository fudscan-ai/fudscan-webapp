/*
  Warnings:

  - You are about to drop the `_ApiToolToClient` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_ApiToolToClient" DROP CONSTRAINT "_ApiToolToClient_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_ApiToolToClient" DROP CONSTRAINT "_ApiToolToClient_B_fkey";

-- DropTable
DROP TABLE "public"."_ApiToolToClient";

-- CreateTable
CREATE TABLE "client_api_tools" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "api_tool_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_api_tools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_api_tools_client_id_idx" ON "client_api_tools"("client_id");

-- CreateIndex
CREATE INDEX "client_api_tools_api_tool_id_idx" ON "client_api_tools"("api_tool_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_api_tools_client_id_api_tool_id_key" ON "client_api_tools"("client_id", "api_tool_id");

-- AddForeignKey
ALTER TABLE "client_api_tools" ADD CONSTRAINT "client_api_tools_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_api_tools" ADD CONSTRAINT "client_api_tools_api_tool_id_fkey" FOREIGN KEY ("api_tool_id") REFERENCES "api_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
