<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const dashboard = $derived(data.personalDashboard);
</script>

<svelte:head>
	<title>{data.authenticated ? 'Your dashboard' : 'Understand your organization'} | Org Teams</title
	>
	<meta
		name="description"
		content={data.authenticated
			? 'See your current place across Organizations, Teams, roles, and reporting contexts.'
			: 'Understand how people, Teams, roles, and reporting relationships fit together across your organization.'}
	/>
</svelte:head>

{#if data.authenticated}
	<section aria-labelledby="dashboard-heading" class="space-y-8 py-2 sm:py-6">
		<header class="max-w-3xl">
			<p class="text-sm font-semibold tracking-widest text-teal-700 uppercase">Your organization</p>
			<h1
				id="dashboard-heading"
				class="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl"
			>
				Welcome{dashboard ? `, ${dashboard.person.displayName}` : ''}
			</h1>
			{#if dashboard?.teamCount}
				<p class="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
					Your current place spans {dashboard.teamCount} Team{dashboard.teamCount === 1 ? '' : 's'}
					across {dashboard.organizationCount} Organization{dashboard.organizationCount === 1
						? ''
						: 's'}. Each Team keeps its own role and reporting context.
				</p>
			{:else}
				<p class="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
					This is your personal view of where you work across Organizations and Teams.
				</p>
			{/if}
		</header>

		{#if dashboard?.organizations.length}
			<div class="grid gap-6" aria-label="Your current Organizations and Teams">
				{#each dashboard.organizations as organization (organization.id)}
					<section
						class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
						aria-labelledby={`organization-${organization.id}`}
					>
						<header class="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
							<p class="text-xs font-semibold tracking-wider text-teal-700 uppercase">
								Organization through your Teams
							</p>
							<h2 id={`organization-${organization.id}`} class="mt-1 text-2xl font-semibold">
								{organization.name}
							</h2>
						</header>
						<ul class="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 sm:p-6">
							{#each organization.teams as team (team.id)}
								<li class="rounded-xl border border-slate-200 p-5">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<h3 class="text-lg font-semibold text-slate-950">{team.name}</h3>
										<span
											class="rounded-full px-2.5 py-1 text-xs font-semibold {team.kind === 'manager'
												? 'bg-teal-100 text-teal-900'
												: 'bg-slate-100 text-slate-700'}"
										>
											{team.kind === 'manager' ? 'Manager' : 'Member'}
										</span>
									</div>
									<dl class="mt-4 space-y-3 text-sm">
										<div>
											<dt class="font-medium text-slate-500">Your role</dt>
											<dd class="mt-0.5 text-slate-900">{team.role}</dd>
										</div>
										{#if team.kind === 'member'}
											<div>
												<dt class="font-medium text-slate-500">Manager in this Team</dt>
												<dd class="mt-0.5 text-slate-900">
													{team.contextualManager?.displayName ?? 'No manager currently assigned'}
												</dd>
											</div>
										{:else}
											<div>
												<dt class="font-medium text-slate-500">Team context</dt>
												<dd class="mt-0.5 text-slate-900">You manage this Team</dd>
											</div>
										{/if}
									</dl>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		{:else}
			<section
				class="max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 shadow-sm"
				aria-labelledby="no-assignments-heading"
			>
				<p class="text-sm font-semibold text-teal-700">Your place is ready to take shape</p>
				<h2 id="no-assignments-heading" class="mt-2 text-2xl font-semibold">
					No current Team assignments
				</h2>
				<p class="mt-3 leading-7 text-slate-600">
					You are not currently listed as a Team member or manager. When a Team relationship is
					assigned, its Organization, your role, and your reporting context will appear here.
				</p>
			</section>
		{/if}
	</section>
{:else}
	<section aria-labelledby="welcome-heading" class="py-5 sm:py-10">
		<div class="max-w-4xl">
			<p class="text-sm font-semibold tracking-widest text-teal-700 uppercase">
				Clarity for how work really happens
			</p>
			<h1
				id="welcome-heading"
				class="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl"
			>
				Understand your organization, even when work crosses Teams.
			</h1>
			<p class="mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
				Org Teams brings Team structure, roles, and reporting context together so people can see
				where they fit, who they work with, and how every Team connects to the wider organization.
			</p>
			<a
				href={resolve('/login')}
				class="mt-7 inline-flex min-h-11 items-center rounded-md bg-teal-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-teal-800 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
			>
				See your place in the organization
			</a>
		</div>

		<div class="mt-12 grid gap-4 md:grid-cols-3" aria-label="Why Org Teams">
			<article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-sm font-semibold text-teal-700">A structure people can follow</p>
				<h2 class="mt-2 text-xl font-semibold text-slate-950">Teams in context</h2>
				<p class="mt-3 leading-7 text-slate-600">
					See how Teams belong to Organizations and how parent and child Teams create an
					understandable structure.
				</p>
			</article>

			<article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-sm font-semibold text-teal-700">Built for matrix work</p>
				<h2 class="mt-2 text-xl font-semibold text-slate-950">Every role has a place</h2>
				<p class="mt-3 leading-7 text-slate-600">
					Understand the different roles a person holds across Teams and Organizations without
					forcing one assignment to be primary.
				</p>
			</article>

			<article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-sm font-semibold text-teal-700">Reporting that explains itself</p>
				<h2 class="mt-2 text-xl font-semibold text-slate-950">Managers with context</h2>
				<p class="mt-3 leading-7 text-slate-600">
					Know which Team creates each reporting relationship, including when someone works with
					more than one manager.
				</p>
			</article>
		</div>
	</section>
{/if}
