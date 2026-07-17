CREATE TYPE "public"."person_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "admin_audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_auth_user_id" text NOT NULL,
	"target_person_id" uuid,
	"target_auth_user_id" text,
	"action" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "employee_identifier" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "status" "person_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
UPDATE "person"
SET "display_name" = "user"."name"
FROM "user"
WHERE "person"."auth_user_id" = "user"."id";--> statement-breakpoint
UPDATE "person"
SET "display_name" = 'Unnamed person'
WHERE "display_name" IS NULL;--> statement-breakpoint
ALTER TABLE "person" ALTER COLUMN "display_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_target_person_id_person_id_fk" FOREIGN KEY ("target_person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_event_actor_idx" ON "admin_audit_event" USING btree ("actor_auth_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_event_person_idx" ON "admin_audit_event" USING btree ("target_person_id");--> statement-breakpoint
CREATE INDEX "admin_audit_event_created_at_idx" ON "admin_audit_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "person_display_name_idx" ON "person" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "person_status_idx" ON "person" USING btree ("status");--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_employee_identifier_unique" UNIQUE("employee_identifier");
