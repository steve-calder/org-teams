<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Details: {data.person.displayName} | Org Teams</title></svelte:head>

<section
	class="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
	aria-labelledby="details-heading"
>
	<h2 id="details-heading" class="text-xl font-semibold">Person details</h2>
	<p class="mt-1 text-sm text-slate-600">
		These fields belong to the Person, whether or not login exists.
	</p>
	{#if form?.message}<div class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
			<p>{form.message}</p>
			{#if form.blockingTeams?.length}<ul class="mt-2 list-disc space-y-1 pl-5">
					{#each form.blockingTeams as blocking (blocking.id)}<li>
							<a
								class="font-semibold underline"
								href={resolve('/admin/teams/[teamId]', { teamId: blocking.id })}>{blocking.name}</a
							>
						</li>{/each}
				</ul>{/if}
		</div>{/if}
	{#if form?.success}<p
			class="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
			role="status"
		>
			Person details updated.
		</p>{/if}
	<form method="POST" class="mt-6 grid gap-5 sm:grid-cols-2">
		<label class="sm:col-span-2"
			><span class="block text-sm font-medium">Display name</span><input
				required
				name="displayName"
				value={data.person.displayName}
				class="mt-1 w-full rounded-md border-slate-300"
			/></label
		>
		<label
			><span class="block text-sm font-medium">Legal name</span><input
				name="legalName"
				value={data.person.legalName ?? ''}
				class="mt-1 w-full rounded-md border-slate-300"
			/></label
		>
		<label
			><span class="block text-sm font-medium">Employee identifier</span><input
				name="employeeIdentifier"
				value={data.person.employeeIdentifier ?? ''}
				class="mt-1 w-full rounded-md border-slate-300"
			/></label
		>
		<label
			><span class="block text-sm font-medium">Job title</span><input
				name="jobTitle"
				value={data.person.jobTitle ?? ''}
				class="mt-1 w-full rounded-md border-slate-300"
			/></label
		>
		<label
			><span class="block text-sm font-medium">Status</span><select
				name="status"
				class="mt-1 w-full rounded-md border-slate-300"
				><option value="active" selected={data.person.status === 'active'}>Active</option><option
					value="inactive"
					selected={data.person.status === 'inactive'}>Inactive</option
				></select
			></label
		>
		<button
			class="rounded-md bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none sm:col-span-2 sm:justify-self-start"
			>Save details</button
		>
	</form>
</section>
