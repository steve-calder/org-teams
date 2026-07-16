import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const person = pgTable('person', {
	id: uuid('id').defaultRandom().primaryKey(),
	authUserId: text('auth_user_id')
		.unique()
		.references(() => user.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export type Person = typeof person.$inferSelect;
export type NewPerson = typeof person.$inferInsert;
