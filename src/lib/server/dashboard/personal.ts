import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { person } from '$lib/server/db/schema';

export interface PersonalDashboardManager {
	id: string;
	displayName: string;
}

export interface PersonalDashboardTeam {
	id: string;
	name: string;
	kind: 'member' | 'manager';
	role: string;
	contextualManager: PersonalDashboardManager | null;
}

export interface PersonalDashboardOrganization {
	id: string;
	name: string;
	teams: PersonalDashboardTeam[];
}

export interface PersonalDashboard {
	person: {
		id: string;
		displayName: string;
	};
	organizations: PersonalDashboardOrganization[];
	organizationCount: number;
	teamCount: number;
}

const byNameAndId = (left: { name: string; id: string }, right: { name: string; id: string }) =>
	left.name.localeCompare(right.name) || left.id.localeCompare(right.id);

export async function getPersonalDashboard(
	personId: string
): Promise<PersonalDashboard | undefined> {
	const detail = await db.query.person.findFirst({
		where: eq(person.id, personId),
		with: {
			memberships: {
				with: { team: { with: { organization: true, manager: true } } }
			},
			managedTeams: { with: { organization: true } }
		}
	});
	if (!detail) return undefined;

	const organizationGroups = new Map<
		string,
		PersonalDashboardOrganization & { teamIds: Set<string> }
	>();
	const groupFor = (organization: { id: string; name: string }) => {
		let group = organizationGroups.get(organization.id);
		if (!group) {
			group = { id: organization.id, name: organization.name, teams: [], teamIds: new Set() };
			organizationGroups.set(organization.id, group);
		}
		return group;
	};

	if (detail.status === 'active') {
		for (const managedTeam of detail.managedTeams) {
			if (managedTeam.status !== 'active' || managedTeam.organization.status !== 'active') continue;
			const group = groupFor(managedTeam.organization);
			group.teamIds.add(managedTeam.id);
			group.teams.push({
				id: managedTeam.id,
				name: managedTeam.name,
				kind: 'manager',
				role: 'Team manager',
				contextualManager: null
			});
		}

		for (const membership of detail.memberships) {
			const membershipTeam = membership.team;
			if (membershipTeam.status !== 'active' || membershipTeam.organization.status !== 'active') {
				continue;
			}
			const group = groupFor(membershipTeam.organization);
			if (group.teamIds.has(membershipTeam.id)) continue;
			group.teamIds.add(membershipTeam.id);
			const manager = membershipTeam.manager;
			group.teams.push({
				id: membershipTeam.id,
				name: membershipTeam.name,
				kind: 'member',
				role: membership.role,
				contextualManager:
					manager?.status === 'active' && manager.id !== detail.id
						? { id: manager.id, displayName: manager.displayName }
						: null
			});
		}
	}

	const organizations = [...organizationGroups.values()]
		.map((group) => ({
			id: group.id,
			name: group.name,
			teams: group.teams.sort(byNameAndId)
		}))
		.sort(byNameAndId);

	return {
		person: { id: detail.id, displayName: detail.displayName },
		organizations,
		organizationCount: organizations.length,
		teamCount: organizations.reduce((total, organization) => total + organization.teams.length, 0)
	};
}
