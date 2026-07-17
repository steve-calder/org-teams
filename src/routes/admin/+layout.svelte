<script lang="ts">
	import { resolve } from '$app/paths';
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<div class="space-y-8">
	<nav aria-label="Administration" class="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
		<a
			class="rounded-md px-3 py-2 font-semibold text-teal-800 hover:bg-teal-50"
			href={resolve('/admin/people')}>People</a
		>
		<a
			class="rounded-md px-3 py-2 font-semibold text-teal-800 hover:bg-teal-50"
			href={resolve('/admin/organizations')}>Organizations</a
		>
		<a
			class="rounded-md px-3 py-2 font-semibold text-teal-800 hover:bg-teal-50"
			href={resolve('/admin/teams')}>Teams</a
		>
	</nav>
	{@render children()}
</div>
