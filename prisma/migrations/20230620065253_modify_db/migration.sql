/*
  Warnings:

  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Document";

-- CreateTable
CREATE TABLE "members_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "keywords" TEXT,
    "tag" TEXT,
    "url" TEXT,
    "source" TEXT,
    "contents" TEXT,
    "contents_tokens" INTEGER,
    "contents_vector" vector,
    "summary_1" TEXT,
    "summary_1_tokens" INTEGER,
    "summary_1_vector" vector,
    "summary_2" TEXT,
    "summary_2_tokens" INTEGER,
    "summary_2_vector" vector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_documents_pkey" PRIMARY KEY ("id")
);
