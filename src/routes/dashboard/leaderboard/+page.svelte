<script lang="ts">
	import { Trophy, Medal, Star } from 'lucide-svelte';
	const { data } = $props();
</script>

<svelte:head>
	<title>Leaderboard | Shipyard</title>
	<meta name="description" content="See who's leading the way in the Shipyard community" />
</svelte:head>

<div class="text-center">
	<h1 class="m-0 mb-2 font-marker text-4xl text-white max-md:text-3xl">Leaderboard</h1>
	<p class="m-0 mb-8 text-xl font-bold text-white max-md:mb-6 max-md:text-base">
		Most shipped hours (with multiplier) 
	</p>
</div>

<div class="mx-auto flex max-w-2xl flex-col gap-3">
	{#each data.users as user, i}
		<div
			class="leaderboard-item group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 transition-all duration-300 hover:border-white/20 hover:bg-white/15"
			style="animation-delay: {i * 50}ms;"
		>
			<div class="flex w-10 shrink-0 items-center justify-center">
				{#if i === 0}
					<div class="rounded-full bg-yellow-400 p-2 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
						<Trophy size={18} class="text-yellow-900" />
					</div>
				{:else if i === 1}
					<div class="rounded-full bg-slate-300 p-2 shadow-[0_0_15px_rgba(148,163,184,0.4)]">
						<Medal size={18} class="text-slate-900" />
					</div>
				{:else if i === 2}
					<div class="rounded-full bg-amber-600 p-2 shadow-[0_0_15px_rgba(217,119,6,0.4)]">
						<Medal size={18} class="text-amber-100" />
					</div>
				{:else}
					<span class="text-lg font-bold text-white/40">#{i + 1}</span>
				{/if}
			</div>

			<div class="avatar-ring h-12 w-12 shrink-0">
				<img src={user.avatar || '/pfp.png'} alt={user.name} class="h-full w-full object-cover" />
			</div>

			<div class="min-w-0 flex-1">
				<h3 class="m-0 truncate text-lg font-bold text-white">{user.name}</h3>
			</div>

			<div class="flex flex-col items-end">
				<div class="flex items-center gap-1.5 text-xl font-bold text-white">
					<Star size={16} class="fill-yellow-400 text-yellow-400" />
					{user.weighted_hours.toFixed(1)}
				</div>
				<span class="text-xs font-medium text-white/40">Weighted Hours</span>
			</div>
		</div>
	{:else}
		<div class="py-20 text-center">
			<p class="text-white/50 italic">No rankings available yet. Start shipping!</p>
		</div>
	{/each}
</div>

<style>
	.leaderboard-item {
		backdrop-filter: blur(8px);
		animation: slideIn 0.5s ease-out backwards;
	}

	.avatar-ring {
		border-radius: 50%;
		border: 2px solid rgba(184, 228, 255, 0.4);
		overflow: hidden;
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
		background: rgba(255, 255, 255, 0.1);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-10px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	h1 {
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
</style>
