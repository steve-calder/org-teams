<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let confirmation = $state('');
	const initialType = () => data.team.type;
	let type = $state(initialType());
	const getBlockingTeams = (): { id: string; name: string }[] =>
		form && 'blockingTeams' in form && Array.isArray(form.blockingTeams)
			? (form.blockingTeams as { id: string; name: string }[])
			: [];
	const blockingTeams = $derived(getBlockingTeams());
</script>

<svelte:head><title>{data.team.name} Admin | Org Teams</title></svelte:head>

<section class="space-y-8">
	<header>
		<a class="text-sm font-semibold text-teal-800 hover:underline" href={resolve('/admin/teams')}
			>← All Teams</a
		>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight">{data.team.name}</h1>
		<p class="mt-1 text-sm text-slate-600">
			<a
				class="font-semibold text-teal-800 hover:underline"
				href={resolve('/admin/organizations/[organizationId]', {
					organizationId: data.organization.id
				})}>{data.organization.name}</a
			>
			· <span class="capitalize">{data.team.status}</span>
		</p>
	</header>
	{#if form?.message}<div class="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
			<p>{form.message}</p>
			{#if blockingTeams.length}<ul class="mt-2 list-disc space-y-1 pl-5">
					{#each blockingTeams as blocking (blocking.id)}<li>
							<a
								class="font-semibold underline"
								href={resolve('/admin/teams/[teamId]', { teamId: blocking.id })}>{blocking.name}</a
							>
						</li>{/each}
				</ul>{/if}
		</div>{/if}
	{#if form?.success}<p class="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
			{form.operation === 'transfer'
				? 'Team transferred.'
				: form.operation === 'parent'
					? 'Parent Team updated.'
					: form.operation === 'manager'
						? 'Team manager updated.'
						: form.operation === 'membershipCreate'
							? 'Team member assigned.'
							: form.operation === 'membershipRole'
								? 'Team member role updated.'
								: form.operation === 'membershipRemove'
									? 'Team member removed.'
									: 'Team updated.'}
		</p>{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<section
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
			aria-labelledby="team-details-heading"
		>
			<h2 id="team-details-heading" class="text-xl font-semibold">Team details</h2>
			<p class="mt-1 text-sm text-slate-600">
				Ownership changes only through the separate transfer control.
			</p>
			<form method="POST" action="?/update" class="mt-5 grid gap-4">
				<label
					><span class="block text-sm font-medium">Team name</span><input
						required
						maxlength="160"
						name="name"
						value={data.team.name}
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				><label
					><span class="block text-sm font-medium">Purpose</span><textarea
						maxlength="2000"
						name="purpose"
						rows="4"
						class="mt-1 w-full rounded-md border-slate-300">{data.team.purpose ?? ''}</textarea
					></label
				><label
					><span class="block text-sm font-medium">Team type</span><select
						name="type"
						bind:value={type}
						class="mt-1 w-full rounded-md border-slate-300"
						>{#each data.teamTypes as option (option.value)}<option value={option.value}
								>{option.label}</option
							>{/each}</select
					></label
				><button
					class="justify-self-start rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
					>Save Team</button
				>
			</form>
			<div class="mt-6 border-t border-slate-200 pt-5">
				<h3 class="font-semibold">Lifecycle</h3>
				{#if data.organization.status === 'inactive'}<p class="mt-2 text-sm text-amber-800">
						This Team cannot be activated while its owning Organization is inactive.
					</p>{/if}
				<form method="POST" action="?/status" class="mt-3">
					<input
						type="hidden"
						name="status"
						value={data.team.status === 'active' ? 'inactive' : 'active'}
					/>
					<button
						class="rounded-md border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 hover:bg-slate-50"
						>{data.team.status === 'active' ? 'Deactivate Team' : 'Reactivate Team'}</button
					>
				</form>
			</div>
		</section>

		<section
			class="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
			aria-labelledby="transfer-heading"
		>
			<h2 id="transfer-heading" class="text-xl font-semibold">Transfer Team</h2>
			<p class="mt-1 text-sm text-slate-700">
				Move this Team to another active Organization while preserving its identity and status.
			</p>
			<form method="POST" action="?/transfer" class="mt-5 grid gap-4">
				<label
					><span class="block text-sm font-medium">Destination Organization</span><select
						required
						name="destinationOrganizationId"
						class="mt-1 w-full rounded-md border-slate-300"
						><option value="">Select a different Organization</option
						>{#each data.activeOrganizations.filter((owner) => owner.id !== data.organization.id) as owner (owner.id)}<option
								value={owner.id}>{owner.name}</option
							>{/each}</select
					></label
				><label
					><span class="block text-sm font-medium">Type TRANSFER to confirm</span><input
						bind:value={confirmation}
						name="confirmation"
						autocomplete="off"
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				><button
					disabled={confirmation !== 'TRANSFER'}
					class="justify-self-start rounded-md bg-amber-700 px-4 py-2.5 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
					>Transfer Team</button
				>
			</form>
		</section>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<section
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
			aria-labelledby="team-hierarchy-heading"
		>
			<h2 id="team-hierarchy-heading" class="text-xl font-semibold">Team hierarchy</h2>
			<div class="mt-4 space-y-3 text-sm">
				<p>
					<span class="font-medium">Parent:</span>
					{#if data.hierarchy?.parent}<a
							class="font-semibold text-teal-800 hover:underline"
							href={resolve('/admin/teams/[teamId]', { teamId: data.hierarchy.parent.id })}
							>{data.hierarchy.parent.name}</a
						>{:else}<span class="text-slate-500">Top-level Team</span>{/if}
				</p>
				<div>
					<p class="font-medium">Child Teams</p>
					{#if data.hierarchy?.children.length}<ul class="mt-1 list-disc space-y-1 pl-5">
							{#each data.hierarchy.children as child (child.id)}<li>
									<a
										class="font-semibold text-teal-800 hover:underline"
										href={resolve('/admin/teams/[teamId]', { teamId: child.id })}>{child.name}</a
									>
									<span class="capitalize text-slate-500"> · {child.status}</span>
								</li>{/each}
						</ul>{:else}<p class="mt-1 text-slate-500">No child Teams.</p>{/if}
				</div>
			</div>
			<form method="POST" action="?/parent" class="mt-5 grid gap-3">
				<label
					><span class="block text-sm font-medium">Parent Team</span><select
						name="parentTeamId"
						class="mt-1 w-full rounded-md border-slate-300"
						><option value="" selected={!data.team.parentTeamId}>No parent — top-level Team</option
						>{#each data.eligibleParents as candidate (candidate.id)}<option
								value={candidate.id}
								selected={candidate.id === data.team.parentTeamId}
								>{candidate.name} · {candidate.status}</option
							>{/each}</select
					></label
				>
				<button
					class="justify-self-start rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
					>Update parent</button
				>
			</form>
		</section>

		<section
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
			aria-labelledby="team-manager-heading"
		>
			<h2 id="team-manager-heading" class="text-xl font-semibold">Team manager</h2>
			<div class="mt-4 space-y-2 text-sm">
				<p>
					<span class="font-medium">Manager:</span>
					{#if data.hierarchy?.manager}<a
							class="font-semibold text-teal-800 hover:underline"
							href={resolve('/admin/people/[personId]', {
								personId: data.hierarchy.manager.id
							})}>{data.hierarchy.manager.displayName}</a
						>{:else}<span class="text-slate-500">No manager assigned</span>{/if}
				</p>
				{#if data.hierarchy?.manager}<p>
						<span class="font-medium">Supervisor through parent Team:</span>
						{#if data.hierarchy.supervisor}<a
								class="font-semibold text-teal-800 hover:underline"
								href={resolve('/admin/people/[personId]', {
									personId: data.hierarchy.supervisor.id
								})}>{data.hierarchy.supervisor.displayName}</a
							>{:else if !data.hierarchy.parent}<span class="text-slate-500"
								>None — this is a top-level Team</span
							>{:else}<span class="text-slate-500">None — the parent Team has no manager</span>{/if}
					</p>{/if}
			</div>
			<p class="mt-4 text-sm text-slate-600">
				The manager counts as a member of this Team. It does not create Organization employment or
				grant access to private information. Promoting an ordinary member replaces that membership.
			</p>
			<form method="POST" action="?/manager" class="mt-5 grid gap-3">
				<label
					><span class="block text-sm font-medium">Manager</span><select
						name="managerPersonId"
						class="mt-1 w-full rounded-md border-slate-300"
						><option value="" selected={!data.team.managerPersonId}>No manager</option
						>{#each data.managerOptions as manager (manager.id)}<option
								value={manager.id}
								selected={manager.id === data.team.managerPersonId}>{manager.displayName}</option
							>{/each}</select
					></label
				>
				<button
					class="justify-self-start rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
					>Update manager</button
				>
			</form>
		</section>
	</div>

	<section
		class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
		aria-labelledby="team-roster-heading"
	>
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 id="team-roster-heading" class="text-xl font-semibold">Team roster</h2>
				<p class="mt-1 text-sm text-slate-600">
					The manager appears once automatically. Ordinary members have a Team-specific role.
				</p>
			</div>
			<p class="text-sm text-slate-500">
				{data.membershipContext?.roster.length ?? 0} member{data.membershipContext?.roster
					.length === 1
					? ''
					: 's'}
			</p>
		</div>

		{#if data.membershipContext?.eligiblePeople.length}
			<form method="POST" action="?/membershipCreate" class="mt-5 grid gap-3 sm:grid-cols-3">
				<label
					><span class="block text-sm font-medium">Person</span><select
						required
						name="personId"
						class="mt-1 w-full rounded-md border-slate-300"
						><option value="">Select a Person</option
						>{#each data.membershipContext.eligiblePeople as candidate (candidate.id)}<option
								value={candidate.id}>{candidate.displayName}</option
							>{/each}</select
					></label
				>
				<label
					><span class="block text-sm font-medium">Role on Team</span><input
						required
						maxlength="160"
						name="role"
						placeholder="e.g. Staff engineer"
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				>
				<button
					class="self-end justify-self-start rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
					>Assign member</button
				>
			</form>
		{:else if data.team.status === 'inactive'}
			<p class="mt-4 text-sm text-amber-800">Reactivate this Team before assigning members.</p>
		{:else}
			<p class="mt-4 text-sm text-slate-500">Every active Person is already assigned.</p>
		{/if}

		<ul class="mt-6 divide-y divide-slate-200">
			{#each data.membershipContext?.roster ?? [] as member (`${member.kind}-${member.personId}`)}
				<li class="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
					<div>
						<a
							class="font-semibold text-teal-800 hover:underline"
							href={resolve('/admin/people/[personId]', { personId: member.personId })}
							>{member.displayName}</a
						>
						<p class="text-sm text-slate-500">
							<span class="capitalize">{member.personStatus}</span> · {member.kind === 'manager'
								? 'Manager membership'
								: 'Ordinary membership'}
						</p>
					</div>
					{#if member.kind === 'manager'}
						<p class="text-sm font-medium">{member.role}</p>
					{:else}
						<div class="flex flex-wrap items-end gap-3">
							<form method="POST" action="?/membershipRole" class="flex flex-1 items-end gap-2">
								<input type="hidden" name="membershipId" value={member.membershipId ?? ''} />
								<label class="flex-1"
									><span class="block text-sm font-medium">Role on Team</span><input
										required
										maxlength="160"
										name="role"
										value={member.role}
										class="mt-1 w-full rounded-md border-slate-300"
									/></label
								>
								<button
									class="rounded-md border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50"
									>Save role</button
								>
							</form>
							<form method="POST" action="?/membershipRemove">
								<input type="hidden" name="membershipId" value={member.membershipId ?? ''} />
								<button
									class="rounded-md border border-red-300 bg-white px-3 py-2 font-semibold text-red-700 hover:bg-red-50"
									>Remove</button
								>
							</form>
						</div>
					{/if}
				</li>
			{:else}
				<li class="py-4 text-sm text-slate-500">No manager or ordinary members assigned.</li>
			{/each}
		</ul>
	</section>

	<section
		class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
		aria-labelledby="team-activity-heading"
	>
		<h2 id="team-activity-heading" class="text-xl font-semibold">Recent activity</h2>
		<ul class="mt-4 space-y-3 text-sm">
			{#each data.auditEvents as event (event.id)}<li>
					<span class="font-medium">{event.action}</span><span class="block text-slate-500"
						>{event.createdAt.toLocaleString()}</span
					>
				</li>{:else}<li class="text-slate-500">No administrative activity yet.</li>{/each}
		</ul>
	</section>
</section>
