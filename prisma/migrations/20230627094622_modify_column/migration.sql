-- AlterTable
ALTER TABLE "members_documents" ADD COLUMN     "is_similar_vector_exists" BOOLEAN DEFAULT false,
ADD COLUMN     "is_summary_1_ok" BOOLEAN DEFAULT false,
ADD COLUMN     "is_tag_ok" BOOLEAN DEFAULT false;
