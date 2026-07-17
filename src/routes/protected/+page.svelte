<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Authenticated | Org Teams</title>
</svelte:head>

<section
	class="mx-auto flex w-full max-w-2xl items-center py-4 sm:py-10"
	aria-labelledby="protected-heading"
>
	<div class="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
		<p class="text-sm font-semibold tracking-wide text-teal-700 uppercase">Authenticated</p>
		<h1 id="protected-heading" class="mt-2 text-3xl font-semibold text-slate-950">
			Protected page
		</h1>
		<p class="mt-4 text-slate-700">
			Signed in as <strong>{data.user.name}</strong> ({data.user.email}).
		</p>
		<p class="mt-2 text-sm text-slate-500">Linked Person: {data.person.id}</p>
	</div>
</section>
