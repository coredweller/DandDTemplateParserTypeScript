ALTER TABLE "monsters" ADD COLUMN "type" text NOT NULL DEFAULT 'general';
--> statement-breakpoint
UPDATE "monsters" SET "type" = 'legendary' WHERE challenge_rating IS NOT NULL OR proficiency_bonus IS NOT NULL OR legendary_action_uses IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "monsters" ALTER COLUMN "type" DROP DEFAULT;
