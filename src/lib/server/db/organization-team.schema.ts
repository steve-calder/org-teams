import { relations, sql } from 'drizzle-orm';
import {
	check,
	index,
	pgTable,
	text,
	timestamp,
	uuid,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { person } from './person.schema';

export const LIFECYCLE_STATUSES = ['active', 'inactive'] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const TEAM_TYPES = [
	'department',
	'functional',
	'product',
	'delivery',
	'project',
	'geographic',
	'committee',
	'community',
	'other'
] as const;
export type TeamType = (typeof TEAM_TYPES)[number];

export const organization = pgTable(
	'organization',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: text('name').notNull(),
		description: text('description'),
		status: text('status').$type<LifecycleStatus>().default('active').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('organization_name_idx').on(table.name, table.id),
		index('organization_status_idx').on(table.status),
		check('organization_name_length_check', sql`char_length(${table.name}) between 1 and 160`),
		check(
			'organization_description_length_check',
			sql`${table.description} is null or char_length(${table.description}) <= 2000`
		),
		check('organization_status_check', sql`${table.status} in ('active', 'inactive')`)
	]
);

export const team = pgTable(
	'team',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
		parentTeamId: uuid('parent_team_id').references((): AnyPgColumn => team.id, {
			onDelete: 'restrict',
			onUpdate: 'restrict'
		}),
		managerPersonId: uuid('manager_person_id').references(() => person.id, {
			onDelete: 'restrict',
			onUpdate: 'restrict'
		}),
		name: text('name').notNull(),
		purpose: text('purpose'),
		type: text('type').$type<TeamType>().notNull(),
		status: text('status').$type<LifecycleStatus>().default('active').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('team_organization_idx').on(table.organizationId),
		index('team_parent_idx').on(table.parentTeamId),
		index('team_manager_idx').on(table.managerPersonId),
		index('team_name_idx').on(table.name, table.id),
		index('team_status_idx').on(table.status),
		index('team_type_idx').on(table.type),
		index('team_directory_idx').on(table.organizationId, table.status, table.type),
		check('team_name_length_check', sql`char_length(${table.name}) between 1 and 160`),
		check(
			'team_purpose_length_check',
			sql`${table.purpose} is null or char_length(${table.purpose}) <= 2000`
		),
		check(
			'team_type_check',
			sql`${table.type} in ('department', 'functional', 'product', 'delivery', 'project', 'geographic', 'committee', 'community', 'other')`
		),
		check('team_status_check', sql`${table.status} in ('active', 'inactive')`)
	]
);

export const organizationRelations = relations(organization, ({ many }) => ({
	teams: many(team)
}));

export const teamRelations = relations(team, ({ one, many }) => ({
	organization: one(organization, {
		fields: [team.organizationId],
		references: [organization.id]
	}),
	parent: one(team, {
		fields: [team.parentTeamId],
		references: [team.id],
		relationName: 'teamHierarchy'
	}),
	children: many(team, { relationName: 'teamHierarchy' }),
	manager: one(person, {
		fields: [team.managerPersonId],
		references: [person.id]
	})
}));

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
export type Team = typeof team.$inferSelect;
export type NewTeam = typeof team.$inferInsert;
