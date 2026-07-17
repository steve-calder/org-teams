import { relations, sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organization, team } from './organization-team.schema';
import { person } from './person.schema';

export const adminAuditEvent = pgTable(
	'admin_audit_event',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		actorAuthUserId: text('actor_auth_user_id').notNull(),
		targetPersonId: uuid('target_person_id').references(() => person.id, {
			onDelete: 'set null'
		}),
		targetOrganizationId: uuid('target_organization_id').references(() => organization.id, {
			onDelete: 'set null'
		}),
		targetTeamId: uuid('target_team_id').references(() => team.id, {
			onDelete: 'set null'
		}),
		targetAuthUserId: text('target_auth_user_id'),
		action: text('action').notNull(),
		metadata: jsonb('metadata').$type<Record<string, string | number | boolean | null>>().notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('admin_audit_event_actor_idx').on(table.actorAuthUserId),
		index('admin_audit_event_person_idx').on(table.targetPersonId),
		index('admin_audit_event_organization_idx').on(table.targetOrganizationId),
		index('admin_audit_event_team_idx').on(table.targetTeamId),
		index('admin_audit_event_created_at_idx').on(table.createdAt),
		check(
			'admin_audit_event_domain_target_check',
			sql`num_nonnulls(${table.targetPersonId}, ${table.targetOrganizationId}, ${table.targetTeamId}) <= 1`
		)
	]
);

export const adminAuditEventRelations = relations(adminAuditEvent, ({ one }) => ({
	targetPerson: one(person, {
		fields: [adminAuditEvent.targetPersonId],
		references: [person.id]
	}),
	targetOrganization: one(organization, {
		fields: [adminAuditEvent.targetOrganizationId],
		references: [organization.id]
	}),
	targetTeam: one(team, {
		fields: [adminAuditEvent.targetTeamId],
		references: [team.id]
	})
}));

export type AdminAuditEvent = typeof adminAuditEvent.$inferSelect;
export type NewAdminAuditEvent = typeof adminAuditEvent.$inferInsert;
