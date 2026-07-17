<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.person.displayName} Admin | Org Teams</title></svelte:head>

<div class="grid gap-6 lg:grid-cols-2">
	<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<h2 class="text-xl font-semibold">Person overview</h2>
		<dl class="mt-4 space-y-3 text-sm">
			<div>
				<dt class="font-medium text-slate-500">Employee ID</dt>
				<dd>{data.person.employeeIdentifier ?? 'Not set'}</dd>
			</div>
			<div>
				<dt class="font-medium text-slate-500">Job title</dt>
				<dd>{data.person.jobTitle ?? 'Not set'}</dd>
			</div>
			<div>
				<dt class="font-medium text-slate-500">Login</dt>
				<dd>{data.auth ? (data.auth.banned ? 'Disabled' : 'Active') : 'None'}</dd>
			</div>
		</dl>
	</section>
	<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<h2 class="text-xl font-semibold">Recent activity</h2>
		<ul class="mt-4 space-y-3 text-sm">
			{#each data.auditEvents as event (event.id)}<li class="border-b border-slate-100 pb-3">
					<span class="font-medium">{event.action}</span><span class="block text-slate-500"
						>{event.createdAt.toLocaleString()}</span
					>
				</li>{:else}<li class="text-slate-500">No administrative activity yet.</li>{/each}
		</ul>
	</section>
</div>
