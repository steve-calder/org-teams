import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const personStatus = pgEnum('person_status', ['active', 'inactive']);

export const person = pgTable(
	'person',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		authUserId: text('auth_user_id')
			.unique()
			.references(() => user.id, { onDelete: 'set null' }),
		displayName: text('display_name').notNull(),
		legalName: text('legal_name'),
		employeeIdentifier: text('employee_identifier').unique(),
		jobTitle: text('job_title'),
		status: personStatus('status').default('active').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('person_display_name_idx').on(table.displayName),
		index('person_status_idx').on(table.status)
	]
);

export type Person = typeof person.$inferSelect;
export type NewPerson = typeof person.$inferInsert;
