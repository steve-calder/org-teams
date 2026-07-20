CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_name_length_check" CHECK (char_length("organization"."name") between 1 and 160),
	CONSTRAINT "organization_description_length_check" CHECK ("organization"."description" is null or char_length("organization"."description") <= 2000),
	CONSTRAINT "organization_status_check" CHECK ("organization"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"purpose" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_name_length_check" CHECK (char_length("team"."name") between 1 and 160),
	CONSTRAINT "team_purpose_length_check" CHECK ("team"."purpose" is null or char_length("team"."purpose") <= 2000),
	CONSTRAINT "team_type_check" CHECK ("team"."type" in ('department', 'functional', 'product', 'delivery', 'project', 'geographic', 'committee', 'community', 'other')),
	CONSTRAINT "team_status_check" CHECK ("team"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD COLUMN "target_organization_id" uuid;--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD COLUMN "target_team_id" uuid;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "organization_name_idx" ON "organization" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "organization_status_idx" ON "organization" USING btree ("status");--> statement-breakpoint
CREATE INDEX "team_organization_idx" ON "team" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "team_name_idx" ON "team" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "team_status_idx" ON "team" USING btree ("status");--> statement-breakpoint
CREATE INDEX "team_type_idx" ON "team" USING btree ("type");--> statement-breakpoint
CREATE INDEX "team_directory_idx" ON "team" USING btree ("organization_id","status","type");--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_target_organization_id_organization_id_fk" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_target_team_id_team_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_event_organization_idx" ON "admin_audit_event" USING btree ("target_organization_id");--> statement-breakpoint
CREATE INDEX "admin_audit_event_team_idx" ON "admin_audit_event" USING btree ("target_team_id");--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_domain_target_check" CHECK (num_nonnulls("admin_audit_event"."target_person_id", "admin_audit_event"."target_organization_id", "admin_audit_event"."target_team_id") <= 1);