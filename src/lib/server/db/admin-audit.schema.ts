import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { person } from './person.schema';

export const adminAuditEvent = pgTable(
	'admin_audit_event',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		actorAuthUserId: text('actor_auth_user_id').notNull(),
		targetPersonId: uuid('target_person_id').references(() => person.id, {
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
		index('admin_audit_event_created_at_idx').on(table.createdAt)
	]
);

export const adminAuditEventRelations = relations(adminAuditEvent, ({ one }) => ({
	targetPerson: one(person, {
		fields: [adminAuditEvent.targetPersonId],
		references: [person.id]
	})
}));

export type AdminAuditEvent = typeof adminAuditEvent.$inferSelect;
export type NewAdminAuditEvent = typeof adminAuditEvent.$inferInsert;
