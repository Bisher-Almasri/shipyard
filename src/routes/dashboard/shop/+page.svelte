<script lang="ts">
	import { ShoppingCart } from 'lucide-svelte';

	const { data } = $props();
</script>

<svelte:head>
	<title>Shop | Shipyard</title>
	<meta
		name="description"
		content="Redeem your cargo points for exclusive items in the Shipyard Shop"
	/>
</svelte:head>

<div class="text-center">
	<h1 class="m-0 mb-2 font-marker text-4xl text-white max-md:text-3xl">Shipyard Shop</h1>
	<p class="m-0 mb-8 text-xl font-bold text-white max-md:mb-6 max-md:text-base">
		Redeem your cargo points for exclusive items
	</p>
</div>

<div class="grid grid-cols-2 gap-4 max-md:grid-cols-1">
	{#each data.shopItems as item}
		<div
			class="flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/12 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/18 hover:shadow-xl"
		>
			<div class="flex h-32 w-full items-center justify-center bg-white/5 p-4">
				{#if item.image_url}
					<img src={item.image_url} alt={item.name} class="h-full object-contain drop-shadow-md" />
				{:else}
					<ShoppingCart size={48} class="text-white/20" />
				{/if}
			</div>
			<div class="flex flex-1 flex-col p-5">
				<h3 class="m-0 mb-2 text-xl font-bold text-white">{item.name}</h3>
				<p class="m-0 mb-4 flex-1 text-sm leading-relaxed text-white/80">
					{item.description || 'A mysterious item.'}
				</p>
				<div class="flex items-center justify-between border-t border-white/10 pt-2">
					<span class="py-1 font-bold text-amber-300">{item.cost} pts</span>
					<button
						class="rounded-xl bg-white px-4 py-2 font-bold text-[#1F5390] transition-all hover:scale-105 hover:bg-white/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={data.user.cargo_points < item.cost}>Redeem</button
					>
				</div>
			</div>
		</div>
	{:else}
		<div
			class="col-span-full rounded-2xl border border-white/15 bg-white/12 p-8 text-center backdrop-blur-md"
		>
			<ShoppingCart size={48} class="mx-auto mb-4 text-white/30" />
			<h3 class="text-xl font-bold text-white mb-2">The shop is empty</h3>
			<p class="text-white/80 italic">Check back later for new items!</p>
		</div>
	{/each}
</div>
