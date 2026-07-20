<script lang="ts">
	import { resolve } from '$app/paths';
	import type { LayoutData } from './$types';
	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<section class="space-y-6">
	<header>
		<a href={resolve('/admin/people')} class="text-sm font-semibold text-teal-800 hover:underline"
			>← All people</a
		>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
			{data.person.displayName}
		</h1>
		<p class="mt-1 text-sm text-slate-600">
			{data.auth ? data.auth.email : 'No login access'} ·
			<span class="capitalize">{data.person.status}</span>
		</p>
	</header>
	<nav
		aria-label="Person administration"
		class="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
	>
		<a
			class="rounded-md px-3 py-2 font-semibold text-teal-800 hover:bg-teal-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
			href={resolve('/admin/people/[personId]', { personId: data.person.id })}>Overview</a
		>
		<a
			class="rounded-md px-3 py-2 font-semibold text-teal-800 hover:bg-teal-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
			href={resolve('/admin/people/[personId]/details', { personId: data.person.id })}>Details</a
		>
		<a
			class="rounded-md px-3 py-2 font-semibold text-teal-800 hover:bg-teal-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
			href={resolve('/admin/people/[personId]/teams', { personId: data.person.id })}>Teams</a
		>
		<a
			class="rounded-md px-3 py-2 font-semibold text-teal-800 hover:bg-teal-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
			href={resolve('/admin/people/[personId]/authentication', { personId: data.person.id })}
			>Authentication</a
		>
		<a
			class="rounded-md px-3 py-2 font-semibold text-teal-800 hover:bg-teal-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
			href={resolve('/admin/people/[personId]/sessions', { personId: data.person.id })}>Sessions</a
		>
	</nav>
	{@render children()}
</section>
