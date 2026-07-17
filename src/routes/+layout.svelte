<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import orgTeamsLogo from '$lib/assets/org-teams-logo.svg';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<a
	href="#main-content"
	class="fixed top-3 left-3 z-50 -translate-y-20 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:translate-y-0 focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:outline-none"
>
	Skip to main content
</a>

<div class="min-h-screen bg-slate-50 text-slate-950">
	<header class="border-b border-slate-200 bg-white shadow-sm">
		<div
			class="mx-auto flex min-h-18 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
		>
			<a
				href={resolve('/')}
				aria-label="Org Teams home"
				class="group flex min-w-0 items-center gap-3 rounded-md focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
			>
				<img src={orgTeamsLogo} alt="" aria-hidden="true" class="size-10 shrink-0" />
				<span
					class="truncate text-lg font-semibold tracking-tight text-slate-950 group-hover:text-teal-800 sm:text-xl"
				>
					Org Teams
				</span>
			</a>

			{#if data.authenticated}
				<form method="POST" action={resolve('/logout')}>
					<button
						type="submit"
						class="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
					>
						Logout
					</button>
				</form>
			{:else}
				<a
					href={resolve('/login')}
					class="inline-flex min-h-11 items-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
				>
					Login
				</a>
			{/if}
		</div>
	</header>

	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto w-full max-w-6xl px-4 py-10 focus:outline-none sm:px-6 sm:py-14 lg:px-8"
	>
		{@render children()}
	</main>
</div>
