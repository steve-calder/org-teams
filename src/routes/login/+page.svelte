<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Login | Org Teams</title>
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-md items-center px-6 py-16">
	<section class="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
		<h1 class="text-2xl font-semibold text-slate-950">Login</h1>
		<p class="mt-2 text-sm text-slate-600">Use your account email and password.</p>

		{#if data.devCredentials}
			<aside class="mt-5 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
				<p class="font-medium text-slate-900">Development account</p>
				<p class="mt-1">
					Email: <code>{data.devCredentials.email}</code><br />
					Password: <code>{data.devCredentials.password}</code>
				</p>
			</aside>
		{/if}

		{#if form?.message}
			<p class="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
				{form.message}
			</p>
		{/if}

		<form method="POST" use:enhance class="mt-6 space-y-5">
			<div>
				<label for="email" class="block text-sm font-medium text-slate-800">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form?.email ?? ''}
					aria-invalid={form?.errors?.email ? 'true' : undefined}
					aria-describedby={form?.errors?.email ? 'email-error' : undefined}
					class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-teal-600 focus:ring-teal-600"
				/>
				{#if form?.errors?.email}
					<p id="email-error" class="mt-1 text-sm text-red-700">{form.errors.email}</p>
				{/if}
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-slate-800">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					aria-invalid={form?.errors?.password ? 'true' : undefined}
					aria-describedby={form?.errors?.password ? 'password-error' : undefined}
					class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-teal-600 focus:ring-teal-600"
				/>
				{#if form?.errors?.password}
					<p id="password-error" class="mt-1 text-sm text-red-700">{form.errors.password}</p>
				{/if}
			</div>

			<button
				type="submit"
				class="w-full rounded-md bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
			>
				Login
			</button>
		</form>
	</section>
</main>
