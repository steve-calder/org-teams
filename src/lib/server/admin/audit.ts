import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adminAuditEvent } from '$lib/server/db/schema';

export type AuditMetadata = Record<string, string | number | boolean | null>;

export interface AuditInput {
	actorAuthUserId: string;
	targetPersonId?: string | null;
	targetOrganizationId?: string | null;
	targetTeamId?: string | null;
	targetAuthUserId?: string | null;
	action: string;
	metadata?: Record<string, unknown>;
}

type AuditExecutor = Pick<typeof db, 'insert'>;

const SENSITIVE_KEY = /password|token|secret|cookie|authorization|credential/i;

export function sanitizeAuditMetadata(metadata: Record<string, unknown> = {}): AuditMetadata {
	return Object.fromEntries(
		Object.entries(metadata).flatMap(([key, value]) => {
			if (SENSITIVE_KEY.test(key)) return [];
			if (
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean' ||
				value === null
			) {
				return [[key, value]];
			}
			return [];
		})
	);
}

export async function writeAdminAudit(executor: AuditExecutor, input: AuditInput): Promise<void> {
	await executor.insert(adminAuditEvent).values({
		actorAuthUserId: input.actorAuthUserId,
		targetPersonId: input.targetPersonId,
		targetOrganizationId: input.targetOrganizationId,
		targetTeamId: input.targetTeamId,
		targetAuthUserId: input.targetAuthUserId,
		action: input.action,
		metadata: sanitizeAuditMetadata(input.metadata)
	});
}

export async function recordAdminAudit(input: AuditInput): Promise<void> {
	await writeAdminAudit(db, input);
}

export async function listPersonAuditEvents(personId: string, limit = 25) {
	return db.query.adminAuditEvent.findMany({
		where: eq(adminAuditEvent.targetPersonId, personId),
		orderBy: [desc(adminAuditEvent.createdAt)],
		limit: Math.min(Math.max(limit, 1), 100)
	});
}

export async function listOrganizationAuditEvents(organizationId: string, limit = 25) {
	return db.query.adminAuditEvent.findMany({
		where: eq(adminAuditEvent.targetOrganizationId, organizationId),
		orderBy: [desc(adminAuditEvent.createdAt)],
		limit: Math.min(Math.max(limit, 1), 100)
	});
}

export async function listTeamAuditEvents(teamId: string, limit = 25) {
	return db.query.adminAuditEvent.findMany({
		where: eq(adminAuditEvent.targetTeamId, teamId),
		orderBy: [desc(adminAuditEvent.createdAt)],
		limit: Math.min(Math.max(limit, 1), 100)
	});
}
