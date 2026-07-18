ALTER TABLE "team" ADD COLUMN "parent_team_id" uuid;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "manager_person_id" uuid;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_parent_team_id_team_id_fk" FOREIGN KEY ("parent_team_id") REFERENCES "public"."team"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_manager_person_id_person_id_fk" FOREIGN KEY ("manager_person_id") REFERENCES "public"."person"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "team_parent_idx" ON "team" USING btree ("parent_team_id");--> statement-breakpoint
CREATE INDEX "team_manager_idx" ON "team" USING btree ("manager_person_id");