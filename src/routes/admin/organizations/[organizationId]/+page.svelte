<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

{#snippet hierarchyNodes(nodes: PageData['hierarchy']['roots'])}
	<ul class="ml-4 border-l border-slate-200 pl-4" role="group">
		{#each nodes as node (node.id)}
			<li
				class="py-2"
				role="treeitem"
				aria-selected="false"
				aria-expanded={node.children.length ? true : undefined}
			>
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<a
						class="font-semibold text-teal-800 hover:underline"
						href={resolve('/admin/teams/[teamId]', { teamId: node.id })}>{node.name}</a
					>
					<span class="text-xs text-slate-500">
						<span class="capitalize">{node.status}</span>
						· {node.manager ? `Managed by ${node.manager.displayName}` : 'No manager'}
					</span>
				</div>
				{#if node.children.length}{@render hierarchyNodes(node.children)}{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<svelte:head><title>{data.organization.name} Admin | Org Teams</title></svelte:head>

<section class="space-y-8">
	<header>
		<a
			class="text-sm font-semibold text-teal-800 hover:underline"
			href={resolve('/admin/organizations')}>← All Organizations</a
		>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight">{data.organization.name}</h1>
		<p class="mt-1 text-sm text-slate-600 capitalize">
			{data.organization.status} · {data.teams.length} Teams
		</p>
	</header>

	{#if form?.message}<div class="rounded-md bg-red-50 p-4 text-sm text-red-800" role="alert">
			<p>{form.message}</p>
			{#if form.blockingTeams?.length}<ul class="mt-3 list-disc space-y-1 pl-5">
					{#each form.blockingTeams as blocking (blocking.id)}<li>
							<a
								class="font-semibold underline"
								href={resolve('/admin/teams/[teamId]', { teamId: blocking.id })}>{blocking.name}</a
							>
						</li>{/each}
				</ul>{/if}
		</div>{/if}
	{#if form?.success}<p class="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
			Organization updated.
		</p>{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<section
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
			aria-labelledby="organization-details-heading"
		>
			<h2 id="organization-details-heading" class="text-xl font-semibold">Organization details</h2>
			<form method="POST" action="?/update" class="mt-5 grid gap-4">
				<label
					><span class="block text-sm font-medium">Organization name</span><input
						required
						maxlength="160"
						name="name"
						value={data.organization.name}
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				>
				<label
					><span class="block text-sm font-medium">Description</span><textarea
						maxlength="2000"
						name="description"
						rows="5"
						class="mt-1 w-full rounded-md border-slate-300"
						>{data.organization.description ?? ''}</textarea
					></label
				>
				<button
					class="justify-self-start rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
					>Save Organization</button
				>
			</form>
			<div class="mt-6 border-t border-slate-200 pt-5">
				<h3 class="font-semibold">Lifecycle</h3>
				{#if data.activeTeams.length && data.organization.status === 'active'}<p
						class="mt-2 text-sm text-amber-800"
					>
						This Organization cannot be deactivated until its {data.activeTeams.length} active {data
							.activeTeams.length === 1
							? 'Team is'
							: 'Teams are'} transferred or made inactive.
					</p>{/if}
				<form method="POST" action="?/status" class="mt-3">
					<input
						type="hidden"
						name="status"
						value={data.organization.status === 'active' ? 'inactive' : 'active'}
					/>
					<button
						class="rounded-md border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 hover:bg-slate-50"
						>{data.organization.status === 'active'
							? 'Deactivate Organization'
							: 'Reactivate Organization'}</button
					>
				</form>
			</div>
		</section>

		<section
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
			aria-labelledby="organization-teams-heading"
		>
			<h2 id="organization-teams-heading" class="text-xl font-semibold">Team hierarchy</h2>
			<p class="mt-1 text-sm text-slate-600">
				{data.hierarchy.total}
				{data.hierarchy.total === 1 ? 'Team' : 'Teams'} in this Organization
			</p>
			{#if data.hierarchy.hasIntegrityIssue}<p
					class="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900"
					role="alert"
				>
					Some Team relationships could not be placed normally. Review the hierarchy before making
					further changes.
				</p>{/if}
			{#if data.hierarchy.roots.length}<div
					class="mt-4 text-sm"
					role="tree"
					aria-label="Team hierarchy"
				>
					{@render hierarchyNodes(data.hierarchy.roots)}
				</div>{:else}<p class="mt-4 text-sm text-slate-500">
					No Teams belong to this Organization.
				</p>{/if}
		</section>
	</div>

	<section
		class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
		aria-labelledby="organization-activity-heading"
	>
		<h2 id="organization-activity-heading" class="text-xl font-semibold">Recent activity</h2>
		<ul class="mt-4 space-y-3 text-sm">
			{#each data.auditEvents as event (event.id)}<li>
					<span class="font-medium">{event.action}</span><span class="block text-slate-500"
						>{event.createdAt.toLocaleString()}</span
					>
				</li>{:else}<li class="text-slate-500">No administrative activity yet.</li>{/each}
		</ul>
	</section>
</section>
