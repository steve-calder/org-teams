CREATE TABLE "team_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_membership_role_length_check" CHECK (char_length("team_membership"."role") between 1 and 160)
);
--> statement-breakpoint
ALTER TABLE "admin_audit_event" DROP CONSTRAINT "admin_audit_event_domain_target_check";--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "team_membership_person_team_uidx" ON "team_membership" USING btree ("person_id","team_id");--> statement-breakpoint
CREATE INDEX "team_membership_person_idx" ON "team_membership" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "team_membership_team_idx" ON "team_membership" USING btree ("team_id");--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_domain_target_check" CHECK (num_nonnulls("admin_audit_event"."target_person_id", "admin_audit_event"."target_organization_id", "admin_audit_event"."target_team_id") <= 1 or ("admin_audit_event"."target_person_id" is not null and "admin_audit_event"."target_team_id" is not null and "admin_audit_event"."target_organization_id" is null));