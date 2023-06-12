-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vector" vector,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
