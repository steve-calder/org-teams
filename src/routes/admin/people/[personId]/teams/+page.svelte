<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Teams: {data.person.displayName} | Org Teams</title></svelte:head>

<section class="space-y-6" aria-labelledby="person-teams-heading">
	<header>
		<h2 id="person-teams-heading" class="text-xl font-semibold">Teams</h2>
		<p class="mt-1 text-sm text-slate-600">
			Memberships and manager assignments can span Organizations. No Team is primary.
		</p>
	</header>

	{#if form?.message}<p class="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
			{form.message}
		</p>{/if}
	{#if form?.success}<p class="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
			{form.operation === 'create'
				? 'Team assigned.'
				: form.operation === 'role'
					? 'Team role updated.'
					: 'Team membership removed.'}
		</p>{/if}

	<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<h3 class="text-lg font-semibold">Assign to a Team</h3>
		{#if data.membershipContext.eligibleTeams.length}
			<form method="POST" action="?/create" class="mt-4 grid gap-3 sm:grid-cols-3">
				<label
					><span class="block text-sm font-medium">Team</span><select
						required
						name="teamId"
						class="mt-1 w-full rounded-md border-slate-300"
						><option value="">Select a Team</option
						>{#each data.membershipContext.eligibleTeams as candidate (candidate.id)}<option
								value={candidate.id}>{candidate.organizationName} · {candidate.name}</option
							>{/each}</select
					></label
				>
				<label
					><span class="block text-sm font-medium">Role on Team</span><input
						required
						maxlength="160"
						name="role"
						placeholder="e.g. Product designer"
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				>
				<button
					class="self-end justify-self-start rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
					>Assign Team</button
				>
			</form>
		{:else if data.membershipContext.person.status === 'inactive'}
			<p class="mt-3 text-sm text-amber-800">Reactivate this Person before assigning Teams.</p>
		{:else}
			<p class="mt-3 text-sm text-slate-500">No additional active Teams are eligible.</p>
		{/if}
	</section>

	<div class="grid gap-6 lg:grid-cols-2">
		<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<h3 class="text-lg font-semibold">Ordinary memberships</h3>
			<ul class="mt-4 space-y-4">
				{#each data.membershipContext.ordinaryMemberships as membership (membership.membershipId)}
					<li class="rounded-lg border border-slate-200 p-4">
						<div>
							<a
								class="font-semibold text-teal-800 hover:underline"
								href={resolve('/admin/teams/[teamId]', { teamId: membership.teamId })}
								>{membership.teamName}</a
							>
							<p class="text-sm text-slate-500">
								<a
									class="hover:underline"
									href={resolve('/admin/organizations/[organizationId]', {
										organizationId: membership.organizationId
									})}>{membership.organizationName}</a
								>
								· Team {membership.teamStatus} · Organization {membership.organizationStatus}
							</p>
							<p class="mt-1 text-sm">
								Contextual manager:
								{#if membership.contextualManager}<a
										class="font-semibold text-teal-800 hover:underline"
										href={resolve('/admin/people/[personId]', {
											personId: membership.contextualManager.id
										})}>{membership.contextualManager.displayName}</a
									>{:else}<span class="text-slate-500">None currently</span>{/if}
							</p>
						</div>
						<div class="mt-4 flex flex-wrap items-end gap-3">
							<form method="POST" action="?/role" class="flex flex-1 items-end gap-2">
								<input type="hidden" name="membershipId" value={membership.membershipId} />
								<label class="flex-1"
									><span class="block text-sm font-medium">Role on Team</span><input
										required
										maxlength="160"
										name="role"
										value={membership.role}
										class="mt-1 w-full rounded-md border-slate-300"
									/></label
								>
								<button
									class="rounded-md border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50"
									>Save</button
								>
							</form>
							<form method="POST" action="?/remove">
								<input type="hidden" name="membershipId" value={membership.membershipId} />
								<button
									class="rounded-md border border-red-300 bg-white px-3 py-2 font-semibold text-red-700 hover:bg-red-50"
									>Remove</button
								>
							</form>
						</div>
					</li>
				{:else}
					<li class="text-sm text-slate-500">No ordinary Team memberships.</li>
				{/each}
			</ul>
		</section>

		<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<h3 class="text-lg font-semibold">Managed Teams</h3>
			<p class="mt-1 text-sm text-slate-600">Manager assignment counts as Team membership.</p>
			<ul class="mt-4 space-y-3">
				{#each data.membershipContext.managedTeams as managedTeam (managedTeam.teamId)}
					<li class="rounded-lg border border-slate-200 p-4">
						<a
							class="font-semibold text-teal-800 hover:underline"
							href={resolve('/admin/teams/[teamId]', { teamId: managedTeam.teamId })}
							>{managedTeam.teamName}</a
						>
						<p class="text-sm text-slate-500">
							<a
								class="hover:underline"
								href={resolve('/admin/organizations/[organizationId]', {
									organizationId: managedTeam.organizationId
								})}>{managedTeam.organizationName}</a
							>
							· Team {managedTeam.teamStatus} · {managedTeam.role}
						</p>
					</li>
				{:else}
					<li class="text-sm text-slate-500">This Person manages no Teams.</li>
				{/each}
			</ul>
		</section>
	</div>
</section>
