<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showCreateOrganizationOverride = $state<boolean | null>(null);
	let showCreateOrganization = $derived(
		showCreateOrganizationOverride ?? Boolean(form?.message || form?.success)
	);
	function pageQuery(page: number) {
		const params = new SvelteURLSearchParams({ page: page.toString() });
		if (data.search) params.set('search', data.search);
		if (data.status !== 'all') params.set('status', data.status);
		return `?${params}`;
	}
</script>

<svelte:head><title>Organizations Admin | Org Teams</title></svelte:head>

<section aria-labelledby="organizations-heading" class="space-y-8">
	<header>
		<p class="text-sm font-semibold tracking-wide text-teal-700 uppercase">Administration</p>
		<div class="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<h1 id="organizations-heading" class="text-3xl font-semibold tracking-tight">
				Organizations
			</h1>
			{#if !showCreateOrganization}
				<button
					type="button"
					aria-controls="create-organization-controls"
					aria-expanded="false"
					class="rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
					onclick={() => (showCreateOrganizationOverride = true)}>Add new Organization</button
				>
			{/if}
		</div>
		<div class="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
			<p class="text-slate-600">Define the organizations that own Teams.</p>
			<p class="text-sm text-slate-500">{data.total} total</p>
		</div>
	</header>

	{#if showCreateOrganization}
		<section
			id="create-organization-controls"
			aria-labelledby="create-organization-heading"
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
		>
			<div class="flex flex-wrap items-start justify-between gap-3">
				<h2 id="create-organization-heading" class="text-xl font-semibold">Add an Organization</h2>
				<button
					type="button"
					class="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
					onclick={() => (showCreateOrganizationOverride = false)}
					>Hide add Organization controls</button
				>
			</div>
			{#if form?.message}<p class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
					{form.message}
				</p>{/if}
			{#if form?.success}<p
					class="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
					role="status"
				>
					Organization created.
				</p>{/if}
			<form method="POST" action="?/create" class="mt-5 grid gap-4">
				<label
					><span class="block text-sm font-medium">Organization name</span><input
						required
						maxlength="160"
						name="name"
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				>
				<label
					><span class="block text-sm font-medium">Description</span><textarea
						maxlength="2000"
						name="description"
						rows="3"
						class="mt-1 w-full rounded-md border-slate-300"></textarea></label
				>
				<button
					class="justify-self-start rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
					>Create Organization</button
				>
			</form>
		</section>
	{/if}

	<form
		method="GET"
		class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4"
	>
		<label class="sm:col-span-2"
			><span class="block text-sm font-medium">Search</span><input
				name="search"
				value={data.search}
				placeholder="Organization name"
				class="mt-1 w-full rounded-md border-slate-300"
			/></label
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
					><th class="px-4 py-3">Organization</th><th class="px-4 py-3">Active Teams</th><th
						class="px-4 py-3">Status</th
					></tr
				></thead
			>
			<tbody class="divide-y divide-slate-100">
				{#each data.organizations as row (row.organization.id)}
					<tr
						><td class="px-4 py-4"
							><a
								class="font-semibold text-teal-800 hover:underline"
								href={resolve('/admin/organizations/[organizationId]', {
									organizationId: row.organization.id
								})}>{row.organization.name}</a
							><span class="block max-w-xl truncate text-sm text-slate-500"
								>{row.organization.description ?? 'No description'}</span
							></td
						><td class="px-4 py-4 text-sm">{row.activeTeamCount}</td><td
							class="px-4 py-4 text-sm capitalize">{row.organization.status}</td
						></tr
					>
				{:else}<tr
						><td colspan="3" class="px-4 py-10 text-center text-slate-500"
							>No Organizations match these filters.</td
						></tr
					>{/each}
			</tbody>
		</table>
	</div>

	<nav aria-label="Organization pagination" class="flex justify-between text-sm">
		{#if data.page > 1}<a
				class="font-semibold text-teal-800"
				href={resolve('/admin/organizations') + pageQuery(data.page - 1)}>Previous</a
			>{:else}<span></span>{/if}
		<span>Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
		{#if data.page * data.pageSize < data.total}<a
				class="font-semibold text-teal-800"
				href={resolve('/admin/organizations') + pageQuery(data.page + 1)}>Next</a
			>{/if}
	</nav>
</section>
