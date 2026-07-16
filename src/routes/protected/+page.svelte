<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Authenticated | Org Teams</title>
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-16">
	<section class="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
		<p class="text-sm font-semibold tracking-wide text-teal-700 uppercase">Authenticated</p>
		<h1 class="mt-2 text-3xl font-semibold text-slate-950">Protected page</h1>
		<p class="mt-4 text-slate-700">
			Signed in as <strong>{data.user.name}</strong> ({data.user.email}).
		</p>
		<p class="mt-2 text-sm text-slate-500">Linked Person: {data.person.id}</p>

		<form method="POST" action="?/logout" class="mt-8">
			<button
				type="submit"
				class="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 hover:bg-slate-50 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
			>
				Logout
			</button>
		</form>
	</section>
</main>
