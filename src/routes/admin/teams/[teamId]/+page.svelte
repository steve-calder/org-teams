<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let confirmation = $state('');
	const initialType = () => data.team.type;
	let type = $state(initialType());
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
	{#if form?.message}<p class="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
			{form.message}
		</p>{/if}
	{#if form?.success}<p class="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
			{form.operation === 'transfer' ? 'Team transferred.' : 'Team updated.'}
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
