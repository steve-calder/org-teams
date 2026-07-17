<script lang="ts">
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Sessions: {data.person.displayName} | Org Teams</title></svelte:head>
<section class="space-y-5" aria-labelledby="sessions-heading">
	<div>
		<h2 id="sessions-heading" class="text-xl font-semibold">Sessions</h2>
		<p class="mt-1 text-sm text-slate-600">
			Only non-secret device and expiry information is displayed.
		</p>
	</div>
	{#if form?.message}<p role="alert" class="rounded-md bg-red-50 p-3 text-sm text-red-800">
			{form.message}
		</p>{/if}{#if form?.success}<p
			role="status"
			class="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
		>
			{form.success}
		</p>{/if}{#if !data.auth}<div
			class="rounded-xl border border-slate-200 bg-white p-6 text-slate-600"
		>
			This Person has no login or sessions.
		</div>{:else}<form method="POST" action="?/revokeAll">
			<button class="rounded-md border border-slate-300 px-4 py-2.5 font-semibold"
				>Revoke all sessions</button
			>
		</form>
		<ul class="space-y-3">
			{#each data.sessions as session (session.id)}<li
					class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
				>
					<div>
						<p class="font-medium">{session.userAgent ?? 'Unknown device'}</p>
						<p class="text-sm text-slate-500">
							{session.ipAddress ?? 'Unknown IP'} · Expires {session.expiresAt.toLocaleString()}
						</p>
					</div>
					<form method="POST" action="?/revoke">
						<input type="hidden" name="sessionId" value={session.id} /><button
							class="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-800"
							>Revoke</button
						>
					</form>
				</li>{:else}<li class="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
					No active sessions.
				</li>{/each}
		</ul>{/if}
</section>
