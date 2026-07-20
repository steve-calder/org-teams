export const ORGANIZATION_CHART_DISCLOSURE = Symbol('organization-chart-disclosure');

export interface OrganizationChartDisclosureContext {
	toggleOrganization: () => void;
	toggleTeam: (teamId: string) => void;
	pivotTeam: (teamId: string) => void;
	isPivotTeam: (teamId: string) => boolean;
}
