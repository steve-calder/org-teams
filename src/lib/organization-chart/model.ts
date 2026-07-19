export type ChartLifecycleStatus = 'active' | 'inactive';
export type ChartTeamType =
	| 'department'
	| 'functional'
	| 'product'
	| 'delivery'
	| 'project'
	| 'geographic'
	| 'committee'
	| 'community'
	| 'other';

export interface OrganizationChartManager {
	id: string;
	displayName: string;
	status: ChartLifecycleStatus;
}

export interface OrganizationChartTeam {
	id: string;
	name: string;
	type: ChartTeamType;
	status: ChartLifecycleStatus;
	parentTeamId: string | null;
	manager: OrganizationChartManager | null;
	ordinaryMembershipCount: number;
	participantCount: number;
	children: OrganizationChartTeam[];
}

export interface OrganizationChartSummary {
	organization: {
		id: string;
		name: string;
		status: ChartLifecycleStatus;
	};
	roots: OrganizationChartTeam[];
	total: number;
	hasIntegrityIssue: boolean;
}

export interface OrganizationChartOption {
	id: string;
	name: string;
	status: ChartLifecycleStatus;
}
