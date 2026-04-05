<script lang="ts">
	import { ShoppingCart, Package, Truck, CheckCircle } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	const { data } = $props();
	
	let loadingId = $state<string | null>(null);

	const getStatusIcon = (status: string) => {
		if (status === 'shipped') return Truck;
		if (status === 'delivered') return CheckCircle;
		return Package;
	};

	const getStatusColor = (status: string) => {
		if (status === 'shipped') return 'text-blue-400';
		if (status === 'delivered') return 'text-green-400';
		return 'text-amber-400';
	};
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

{#if data?.userRedemptions && data.userRedemptions.length > 0}
	<div class="mb-12">
		<h2 class="mb-4 text-2xl font-bold text-white max-md:text-xl">Your Orders</h2>
		<div class="flex flex-col gap-3">
			{#each data.userRedemptions as order}
				{@const Icon = getStatusIcon(order.status)}
				<div class="flex items-center justify-between rounded-xl bg-white/10 p-4 border border-white/15 backdrop-blur-md">
					<div class="flex items-center gap-4">
						{#if order.shop_items?.image_url}
							<img src={order.shop_items.image_url} alt={order.shop_items.name} class="h-12 w-12 object-contain" />
						{:else}
							<ShoppingCart class="h-8 w-8 text-white/40" />
						{/if}
						<div>
							<h3 class="font-bold text-white">{order.shop_items?.name || 'Unknown Item'}</h3>
							<p class="text-xs text-white/60">{new Date(order.redeemed_at).toLocaleDateString()}</p>
						</div>
					</div>
					<div class="flex flex-col items-end gap-1">
						<div class={`flex items-center gap-2 font-bold capitalize ${getStatusColor(order.status)}`}>
							<Icon size={16} />
							{order.status}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<h2 class="mb-4 text-2xl font-bold text-white max-md:text-xl">Available Items</h2>
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
					<form
						method="POST"
						action="?/redeem"
						use:enhance={() => {
							loadingId = item.id;
							return async ({ update }) => {
								loadingId = null;
								await update();
							};
						}}
					>
						<input type="hidden" name="item_id" value={item.id} />
						<button
							class="rounded-xl bg-white px-4 py-2 font-bold text-[#1F5390] transition-all hover:scale-105 hover:bg-white/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={data.user.cargo_points < item.cost || loadingId === item.id}
						>
							{loadingId === item.id ? '...' : 'Redeem'}
						</button>
					</form>
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
