<script lang="ts">
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Authentication: {data.person.displayName} | Org Teams</title></svelte:head>

<section class="space-y-6" aria-labelledby="authentication-heading">
	<div>
		<h2 id="authentication-heading" class="text-xl font-semibold">Authentication</h2>
		<p class="mt-1 text-sm text-slate-600">
			Login access is managed separately from the Person record.
		</p>
	</div>
	{#if form?.message}<p class="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
			{form.message}
		</p>{/if}
	{#if form?.success}<p class="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
			{form.success}
		</p>{/if}
	{#if !data.auth}
		<form
			method="POST"
			action="?/addLogin"
			class="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
		>
			<h3 class="text-lg font-semibold">Add email/password login</h3>
			<label class="block"
				><span class="text-sm font-medium">Email</span><input
					required
					type="email"
					name="email"
					autocomplete="off"
					class="mt-1 w-full rounded-md border-slate-300"
				/></label
			>
			<label class="block"
				><span class="text-sm font-medium">Initial password</span><input
					required
					minlength="8"
					type="password"
					name="password"
					autocomplete="new-password"
					class="mt-1 w-full rounded-md border-slate-300"
				/></label
			>
			<button class="rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white">Add login</button>
		</form>
	{:else}
		<div class="grid gap-6 lg:grid-cols-2">
			<form
				method="POST"
				action="?/update"
				class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
			>
				<h3 class="text-lg font-semibold">Login identity</h3>
				<p class="text-sm text-slate-500">Display name: {data.person.displayName}</p>
				<label class="block"
					><span class="text-sm font-medium">Login email</span><input
						required
						type="email"
						name="email"
						value={data.auth.email}
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				><button class="rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white"
					>Save login</button
				>
			</form>
			<form
				method="POST"
				action="?/password"
				class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
			>
				<h3 class="text-lg font-semibold">Replace password</h3>
				<label class="block"
					><span class="text-sm font-medium">New password</span><input
						required
						minlength="8"
						type="password"
						name="newPassword"
						autocomplete="new-password"
						class="mt-1 w-full rounded-md border-slate-300"
					/></label
				><button class="rounded-md border border-slate-300 px-4 py-2.5 font-semibold"
					>Replace password</button
				>
			</form>
			<section class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h3 class="text-lg font-semibold">Login status</h3>
				<p class="text-sm">
					{data.auth.banned ? 'Disabled' : 'Active'}{#if data.auth.banReason}
						· {data.auth.banReason}{/if}
				</p>
				{#if data.auth.banned}<form method="POST" action="?/unban">
						<button class="rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white"
							>Enable login</button
						>
					</form>{:else}<form method="POST" action="?/ban" class="space-y-3">
						<label class="block"
							><span class="text-sm font-medium">Reason</span><input
								name="reason"
								class="mt-1 w-full rounded-md border-slate-300"
							/></label
						><button class="rounded-md border border-red-300 px-4 py-2.5 font-semibold text-red-800"
							>Disable login</button
						>
					</form>{/if}
			</section>
			<section class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h3 class="text-lg font-semibold">Administrator access</h3>
				<p class="text-sm">
					Currently {data.auth.isAdmin ? 'an administrator' : 'a standard user'}.
				</p>
				<form method="POST" action="?/admin" class="space-y-3">
					<input
						type="hidden"
						name="isAdmin"
						value={data.auth.isAdmin ? 'false' : 'true'}
					/>{#if data.auth.isAdmin}<label class="block"
							><span class="text-sm font-medium">Type REMOVE ADMIN to confirm</span><input
								name="confirmation"
								class="mt-1 w-full rounded-md border-slate-300"
							/></label
						>{/if}<button class="rounded-md border border-slate-300 px-4 py-2.5 font-semibold"
						>{data.auth.isAdmin ? 'Remove admin' : 'Grant admin'}</button
					>
				</form>
			</section>
		</div>
		<section class="rounded-xl border border-red-200 bg-red-50 p-6">
			<h3 class="text-lg font-semibold text-red-950">Remove login</h3>
			<p class="mt-1 text-sm text-red-800">The Person and profile will be retained.</p>
			<form method="POST" action="?/remove" class="mt-4 max-w-md space-y-3">
				<label class="block"
					><span class="text-sm font-medium text-red-950">Type REMOVE LOGIN to confirm</span><input
						name="confirmation"
						class="mt-1 w-full rounded-md border-red-300"
					/></label
				><button class="rounded-md bg-red-800 px-4 py-2.5 font-semibold text-white"
					>Remove login</button
				>
			</form>
		</section>
	{/if}
</section>
