<svelte:head>
	<title>Welcome | Org Teams</title>
	<meta
		name="description"
		content="Org Teams is a secure, people-centered foundation for understanding how teams fit together."
	/>
</svelte:head>

<section aria-labelledby="welcome-heading" class="py-5 sm:py-10">
	<div class="max-w-3xl">
		<p class="text-sm font-semibold tracking-widest text-teal-700 uppercase">
			People working together
		</p>
		<h1
			id="welcome-heading"
			class="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl"
		>
			Welcome to Org Teams
		</h1>
		<p class="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
			A focused, secure foundation for understanding the people in your organization and how their
			teams fit together.
		</p>
	</div>

	<div class="mt-10 grid gap-4 md:grid-cols-3" aria-label="Org Teams feature highlights">
		<article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-sm font-semibold text-teal-700">People-centered</p>
			<h2 class="mt-2 text-xl font-semibold text-slate-950">Identity with purpose</h2>
			<p class="mt-3 leading-7 text-slate-600">
				Keep each person represented by a stable product identity, separate from how they sign in.
			</p>
		</article>

		<article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-sm font-semibold text-teal-700">Team-ready</p>
			<h2 class="mt-2 text-xl font-semibold text-slate-950">A clear foundation</h2>
			<p class="mt-3 leading-7 text-slate-600">
				Start with dependable people records designed to support clear organizational context.
			</p>
		</article>

		<article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-sm font-semibold text-teal-700">Secure access</p>
			<h2 class="mt-2 text-xl font-semibold text-slate-950">Protected by default</h2>
			<p class="mt-3 leading-7 text-slate-600">
				Server-resolved sessions keep authenticated identity out of client-controlled data.
			</p>
		</article>
	</div>
</section>
