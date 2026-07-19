import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { adminAuditEvent } from '$lib/server/db/schema';
import { writeAdminAudit, type AuditInput } from './audit-core';

export {
	sanitizeAuditMetadata,
	writeAdminAudit,
	type AuditInput,
	type AuditMetadata
} from './audit-core';

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
