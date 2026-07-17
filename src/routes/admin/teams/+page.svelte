<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	function pageQuery(page: number) {
		const params = new SvelteURLSearchParams({ page: page.toString() });
		if (data.search) params.set('search', data.search);
		if (data.organizationId) params.set('organizationId', data.organizationId);
		if (data.type !== 'all') params.set('type', data.type);
		if (data.status !== 'all') params.set('status', data.status);
		return `?${params}`;
	}
</script>

<svelte:head><title>Teams Admin | Org Teams</title></svelte:head>

<section aria-labelledby="teams-heading" class="space-y-8">
	<header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-sm font-semibold tracking-wide text-teal-700 uppercase">Administration</p>
			<h1 id="teams-heading" class="mt-1 text-3xl font-semibold tracking-tight">Teams</h1>
			<p class="mt-2 text-slate-600">Define Teams within their owning Organizations.</p>
		</div>
		<p class="text-sm text-slate-500">{data.total} total</p>
	</header>

	<form
		method="GET"
		class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5"
	>
		<label
			><span class="block text-sm font-medium">Search</span><input
				name="search"
				value={data.search}
				placeholder="Team or Organization"
				class="mt-1 w-full rounded-md border-slate-300"
			/></label
		>
		<label
			><span class="block text-sm font-medium">Organization</span><select
				name="organizationId"
				value={data.organizationId}
				class="mt-1 w-full rounded-md border-slate-300"
				><option value="">All</option>{#each data.organizations as owner (owner.id)}<option
						value={owner.id}>{owner.name}</option
					>{/each}</select
			></label
		>
		<label
			><span class="block text-sm font-medium">Team type</span><select
				name="type"
				value={data.type}
				class="mt-1 w-full rounded-md border-slate-300"
				><option value="all">All</option>{#each data.teamTypes as option (option.value)}<option
						value={option.value}>{option.label}</option
					>{/each}</select
			></label
		>
		<label
			><span class="block text-sm font-medium">Status</span><select
				name="status"
				value={data.status}
				class="mt-1 w-full rounded-md border-slate-300"
				><option value="all">All</option><option value="active">Active</option><option
					value="inactive">Inactive</option
				></select
			></label
		>
		<button
			class="self-end rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
			>Filter</button
		>
	</form>

	<div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
		<table class="min-w-full divide-y divide-slate-200">
			<thead
				class="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
				><tr
					><th class="px-4 py-3">Team</th><th class="px-4 py-3">Organization</th><th
						class="px-4 py-3">Type</th
					><th class="px-4 py-3">Status</th></tr
				></thead
			><tbody class="divide-y divide-slate-100"
				>{#each data.teams as row (row.team.id)}<tr
						><td class="px-4 py-4"
							><a
								class="font-semibold text-teal-800 hover:underline"
								href={resolve('/admin/teams/[teamId]', { teamId: row.team.id })}>{row.team.name}</a
							><span class="block max-w-md truncate text-sm text-slate-500"
								>{row.team.purpose ?? 'No purpose set'}</span
							></td
						><td class="px-4 py-4 text-sm">{row.organization.name}</td><td
							class="px-4 py-4 text-sm capitalize">{row.team.type}</td
						><td class="px-4 py-4 text-sm capitalize">{row.team.status}</td></tr
					>{:else}<tr
						><td colspan="4" class="px-4 py-10 text-center text-slate-500"
							>No Teams match these filters.</td
						></tr
					>{/each}</tbody
			>
		</table>
	</div>

	<nav aria-label="Team pagination" class="flex justify-between text-sm">
		{#if data.page > 1}<a
				class="font-semibold text-teal-800"
				href={resolve('/admin/teams') + pageQuery(data.page - 1)}>Previous</a
			>{:else}<span></span>{/if}<span
			>Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span
		>{#if data.page * data.pageSize < data.total}<a
				class="font-semibold text-teal-800"
				href={resolve('/admin/teams') + pageQuery(data.page + 1)}>Next</a
			>{/if}
	</nav>

	<section
		aria-labelledby="create-team-heading"
		class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
	>
		<h2 id="create-team-heading" class="text-xl font-semibold">Add a Team</h2>
		{#if form?.message}<p class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
				{form.message}
			</p>{/if}{#if form?.success}<p
				class="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
				role="status"
			>
				Team created.
			</p>{/if}
		<form method="POST" action="?/create" class="mt-5 grid gap-4 sm:grid-cols-2">
			<label
				><span class="block text-sm font-medium">Team name</span><input
					required
					maxlength="160"
					name="name"
					class="mt-1 w-full rounded-md border-slate-300"
				/></label
			><label
				><span class="block text-sm font-medium">Owning Organization</span><select
					required
					name="organizationId"
					class="mt-1 w-full rounded-md border-slate-300"
					><option value="">Select an active Organization</option
					>{#each data.organizations.filter((owner) => owner.status === 'active') as owner (owner.id)}<option
							value={owner.id}>{owner.name}</option
						>{/each}</select
				></label
			><label
				><span class="block text-sm font-medium">Team type</span><select
					required
					name="type"
					class="mt-1 w-full rounded-md border-slate-300"
					>{#each data.teamTypes as option (option.value)}<option value={option.value}
							>{option.label}</option
						>{/each}</select
				></label
			><label
				><span class="block text-sm font-medium">Initial status</span><select
					name="status"
					class="mt-1 w-full rounded-md border-slate-300"
					><option value="active">Active</option><option value="inactive">Inactive</option></select
				></label
			><label class="sm:col-span-2"
				><span class="block text-sm font-medium">Purpose</span><textarea
					maxlength="2000"
					name="purpose"
					rows="3"
					class="mt-1 w-full rounded-md border-slate-300"></textarea></label
			><button
				class="justify-self-start rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 sm:col-span-2"
				>Create Team</button
			>
		</form>
	</section>
</section>
