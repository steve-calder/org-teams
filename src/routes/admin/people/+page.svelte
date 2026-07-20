<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- pagination appends a query string to a resolved path */
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showCreatePersonOverride = $state<boolean | null>(null);
	let showCreatePerson = $derived(
		showCreatePersonOverride ?? Boolean(form?.message || form?.success)
	);

	function pageQuery(page: number) {
		const params = new SvelteURLSearchParams({ page: page.toString() });
		if (data.search) params.set('search', data.search);
		if (data.login !== 'all') params.set('login', data.login);
		if (data.status !== 'all') params.set('status', data.status);
		if (data.admin !== 'all') params.set('admin', data.admin);
		return `?${params}`;
	}
</script>

<svelte:head><title>People Admin | Org Teams</title></svelte:head>

<section aria-labelledby="people-heading" class="space-y-8">
	<header>
		<p class="text-sm font-semibold tracking-wide text-teal-700 uppercase">Administration</p>
		<div class="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<h1 id="people-heading" class="text-3xl font-semibold tracking-tight text-slate-950">
				People
			</h1>
			{#if !showCreatePerson}
				<button
					type="button"
					aria-controls="create-person-controls"
					aria-expanded="false"
					class="rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
					onclick={() => (showCreatePersonOverride = true)}>Add new person</button
				>
			{/if}
		</div>
		<div class="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
			<p class="text-slate-600">Manage Person profiles and their optional login access.</p>
			<p class="text-sm text-slate-500">{data.total} total</p>
		</div>
	</header>

	{#if data.orphanedAuthUsers > 0}
		<div
			class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
			role="alert"
		>
			<strong>{data.orphanedAuthUsers} authentication user(s)</strong> have no linked Person and require
			integrity review.
		</div>
	{/if}

	{#if showCreatePerson}
		<section
			id="create-person-controls"
			aria-labelledby="create-person-heading"
			class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
		>
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 id="create-person-heading" class="text-xl font-semibold text-slate-950">
						Add a person without login
					</h2>
					<p class="mt-1 text-sm text-slate-600">Login access can be attached later.</p>
				</div>
				<button
					type="button"
					class="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
					onclick={() => (showCreatePersonOverride = false)}>Hide add person controls</button
				>
			</div>
			{#if form?.message}<p class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
					{form.message}
				</p>{/if}
			{#if form?.success}<p
					class="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
					role="status"
				>
					Person created.
				</p>{/if}
			<form method="POST" action="?/create" class="mt-5 grid gap-4 sm:grid-cols-2">
				<label
					><span class="block text-sm font-medium">Display name</span><input
						required
						name="displayName"
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				>
				<label
					><span class="block text-sm font-medium">Legal name</span><input
						name="legalName"
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				>
				<label
					><span class="block text-sm font-medium">Employee identifier</span><input
						name="employeeIdentifier"
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				>
				<label
					><span class="block text-sm font-medium">Job title</span><input
						name="jobTitle"
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				>
				<button
					class="rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none sm:col-span-2 sm:justify-self-start"
					>Create person</button
				>
			</form>
		</section>
	{/if}

	<form
		method="GET"
		class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6"
	>
		<label class="md:col-span-2">
			<span class="block text-sm font-medium text-slate-800">Search</span>
			<input
				name="search"
				value={data.search ?? ''}
				placeholder="Name, employee ID, or email"
				class="mt-1 w-full rounded-md border-slate-300"
			/>
		</label>
		<label>
			<span class="block text-sm font-medium text-slate-800">Login</span>
			<select name="login" value={data.login} class="mt-1 w-full rounded-md border-slate-300">
				<option value="all">All</option><option value="active">Active</option><option
					value="disabled">Disabled</option
				><option value="none">No login</option>
			</select>
		</label>
		<label>
			<span class="block text-sm font-medium text-slate-800">Person status</span>
			<select name="status" value={data.status} class="mt-1 w-full rounded-md border-slate-300">
				<option value="all">All</option><option value="active">Active</option><option
					value="inactive">Inactive</option
				>
			</select>
		</label>
		<label>
			<span class="block text-sm font-medium text-slate-800">Access</span>
			<select name="admin" value={data.admin} class="mt-1 w-full rounded-md border-slate-300">
				<option value="all">All</option><option value="admin">Administrators</option><option
					value="non-admin">Non-admins</option
				>
			</select>
		</label>
		<button
			class="self-end rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
			>Filter</button
		>
	</form>

	<div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
		<table class="min-w-full divide-y divide-slate-200">
			<thead
				class="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
			>
				<tr
					><th class="px-4 py-3">Person</th><th class="px-4 py-3">Employee ID</th><th
						class="px-4 py-3">Login</th
					><th class="px-4 py-3">Status</th></tr
				>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#each data.people as row (row.person.id)}
					<tr>
						<td class="px-4 py-4"
							><a
								class="font-semibold text-teal-800 underline-offset-2 hover:underline focus:ring-2 focus:ring-teal-600 focus:outline-none"
								href={resolve('/admin/people/[personId]', { personId: row.person.id })}
								>{row.person.displayName}</a
							><span class="block text-sm text-slate-500"
								>{row.person.jobTitle ?? 'No job title'}</span
							></td
						>
						<td class="px-4 py-4 text-sm text-slate-600">{row.person.employeeIdentifier ?? '—'}</td>
						<td class="px-4 py-4 text-sm"
							><span class={row.auth?.banned ? 'text-red-700' : 'text-slate-700'}
								>{row.auth ? (row.auth.banned ? 'Disabled' : row.auth.email) : 'No login'}</span
							>{#if row.auth?.isAdmin}<span
									class="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800"
									>Admin</span
								>{/if}</td
						>
						<td class="px-4 py-4 text-sm capitalize text-slate-600">{row.person.status}</td>
					</tr>
				{:else}
					<tr
						><td colspan="4" class="px-4 py-10 text-center text-slate-500"
							>No people match these filters.</td
						></tr
					>
				{/each}
			</tbody>
		</table>
	</div>

	<nav aria-label="People pagination" class="flex justify-between text-sm">
		{#if data.page > 1}
			<a
				class="font-semibold text-teal-800"
				href={resolve('/admin/people') + pageQuery(data.page - 1)}>Previous</a
			>{:else}<span></span>{/if}
		<span>Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
		{#if data.page * data.pageSize < data.total}
			<a
				class="font-semibold text-teal-800"
				href={resolve('/admin/people') + pageQuery(data.page + 1)}>Next</a
			>{/if}
	</nav>
</section>
