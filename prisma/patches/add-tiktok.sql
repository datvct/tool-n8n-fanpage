-- Additive patch for existing Content Manager databases (PostgreSQL).
-- Apply before deploying the app. No rows or existing enum values are removed.
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'tiktok';
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'tiktok_video';
ALTER TABLE "social_posts" ADD COLUMN IF NOT EXISTS "tiktok_options" JSONB;
