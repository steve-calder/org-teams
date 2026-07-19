import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import type {
	OrganizationChartSummary,
	OrganizationChartTeam
} from '$lib/organization-chart/model';
import { organization, person, team, teamMembership } from '$lib/server/db/schema';

export interface OrganizationChartSelection {
	organizationId: string;
	teamId: string;
}

const byNameAndId = (
	left: Pick<OrganizationChartTeam, 'name' | 'id'>,
	right: Pick<OrganizationChartTeam, 'name' | 'id'>
) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id);

export async function listOrganizationChartOptions() {
	return db
		.select({ id: organization.id, name: organization.name, status: organization.status })
		.from(organization)
		.orderBy(asc(organization.name), asc(organization.id));
}

export async function getDefaultOrganizationChartSelection(
	authUserId: string
): Promise<OrganizationChartSelection | null> {
	const [ordinaryTeams, managedTeams] = await Promise.all([
		db
			.select({
				organizationId: organization.id,
				organizationName: organization.name,
				teamId: team.id,
				teamName: team.name
			})
			.from(person)
			.innerJoin(teamMembership, eq(teamMembership.personId, person.id))
			.innerJoin(team, eq(team.id, teamMembership.teamId))
			.innerJoin(organization, eq(organization.id, team.organizationId))
			.where(eq(person.authUserId, authUserId)),
		db
			.select({
				organizationId: organization.id,
				organizationName: organization.name,
				teamId: team.id,
				teamName: team.name
			})
			.from(person)
			.innerJoin(team, eq(team.managerPersonId, person.id))
			.innerJoin(organization, eq(organization.id, team.organizationId))
			.where(eq(person.authUserId, authUserId))
	]);

	const uniqueTeams = new Map(
		[...ordinaryTeams, ...managedTeams].map((candidate) => [candidate.teamId, candidate])
	);
	const [selected] = [...uniqueTeams.values()].sort(
		(left, right) =>
			left.organizationName.localeCompare(right.organizationName) ||
			left.organizationId.localeCompare(right.organizationId) ||
			left.teamName.localeCompare(right.teamName) ||
			left.teamId.localeCompare(right.teamId)
	);

	return selected ? { organizationId: selected.organizationId, teamId: selected.teamId } : null;
}

export async function getOrganizationChart(
	organizationId: string
): Promise<OrganizationChartSummary | undefined> {
	const selectedOrganization = await db.query.organization.findFirst({
		where: eq(organization.id, organizationId),
		columns: { id: true, name: true, status: true }
	});
	if (!selectedOrganization) return undefined;

	const rows = await db.query.team.findMany({
		where: eq(team.organizationId, organizationId),
		columns: {
			id: true,
			name: true,
			type: true,
			status: true,
			parentTeamId: true
		},
		with: {
			manager: { columns: { id: true, displayName: true, status: true } },
			memberships: { columns: { id: true } }
		},
		orderBy: [asc(team.name), asc(team.id)]
	});

	const nodes = new Map<string, OrganizationChartTeam>();
	for (const row of rows) {
		const ordinaryMembershipCount = row.memberships.length;
		nodes.set(row.id, {
			id: row.id,
			name: row.name,
			type: row.type,
			status: row.status,
			parentTeamId: row.parentTeamId,
			manager: row.manager,
			ordinaryMembershipCount,
			participantCount: ordinaryMembershipCount + (row.manager ? 1 : 0),
			children: []
		});
	}

	const roots: OrganizationChartTeam[] = [];
	let hasIntegrityIssue = false;
	for (const node of nodes.values()) {
		if (!node.parentTeamId) {
			roots.push(node);
			continue;
		}
		const parent = nodes.get(node.parentTeamId);
		if (!parent) {
			hasIntegrityIssue = true;
			roots.push(node);
			continue;
		}
		parent.children.push(node);
	}

	const sortForest = (items: OrganizationChartTeam[], ancestors = new Set<string>()) => {
		items.sort(byNameAndId);
		for (const item of items) {
			if (ancestors.has(item.id)) {
				hasIntegrityIssue = true;
				item.children = [];
				continue;
			}
			sortForest(item.children, new Set([...ancestors, item.id]));
		}
	};
	sortForest(roots);

	return {
		organization: selectedOrganization,
		roots,
		total: rows.length,
		hasIntegrityIssue
	};
}
