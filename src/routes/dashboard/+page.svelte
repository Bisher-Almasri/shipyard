<script lang="ts">
	import { Star, LayoutGrid, ShoppingCart, Clock } from 'lucide-svelte';

	const { data } = $props();
</script>

<svelte:head>
	<title>Dashboard | Shipyard</title>
	<meta
		name="description"
		content="Your Shipyard dashboard - track your progress, jobs, and cargo points"
	/>
</svelte:head>

<div class="text-center">
	<h1 class="m-0 mb-2 font-marker text-4xl text-white max-md:text-3xl">
		Welcome to Your Dashboard
	</h1>
	<p class="m-0 mb-8 text-xl font-bold text-white max-md:mb-6 max-md:text-base">
		Track your progress and manage your shipyard jobs
	</p>
</div>

<div class="mb-10 grid grid-cols-4 gap-4 max-md:grid-cols-1 max-md:gap-3">
	<div
		class="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 max-md:p-4"
	>
		<div
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white"
		>
			<Star size={24} />
		</div>
		<div class="flex flex-col">
			<span class="text-3xl leading-tight font-bold text-white">{data.user.cargo_points}</span>
			<span class="text-sm font-semibold text-white">Cargo Points</span>
		</div>
	</div>
	<div
		class="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 max-md:p-4"
	>
		<div
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white"
		>
			<LayoutGrid size={24} />
		</div>
		<div class="flex flex-col">
			<span class="text-3xl leading-tight font-bold text-white">{data.stats.jobsCompleted}</span>
			<span class="text-sm font-semibold text-white">Jobs Completed</span>
		</div>
	</div>
	<div
		class="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 max-md:p-4"
	>
		<div
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white"
		>
			<ShoppingCart size={24} />
		</div>
		<div class="flex flex-col">
			<span class="text-3xl leading-tight font-bold text-white">{data.stats.itemsRedeemed}</span>
			<span class="text-sm font-semibold text-white">Items Redeemed</span>
		</div>
	</div>
	<div
		class="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 max-md:p-4"
	>
		<div
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white"
		>
			<Clock size={24} />
		</div>
		<div class="flex flex-col">
			<span class="text-3xl leading-tight font-bold text-white">
				{data.hackatime?.hours ?? '0.0'}h
			</span>
			<span class="text-sm font-semibold text-white">
				Total Linked Coding Time • {data.hackatime?.streak ?? 0}d streak
			</span>
		</div>
	</div>
</div>

<div class="mt-6">
	<h2 class="m-0 mb-5 font-marker text-2xl text-white drop-shadow-sm">Active Jobs</h2>
	<div class="flex flex-col gap-4">
		{#each data.jobs as job}
			{@const isCompleted = data.completedJobIds.includes(job.id)}
			{@const isMissed = new Date(job.deadline) < new Date()}
			<div
				class="relative rounded-2xl border border-white/15 bg-white/12 p-5 backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-white/18 hover:shadow-lg"
			>
				<div class="mb-3 flex items-start justify-between gap-4">
					<h3 class="m-0 text-xl font-bold text-white max-md:text-lg">{job.title}</h3>
					{#if isCompleted}
						<span
							class="shrink-0 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold tracking-wide text-amber-950 uppercase"
							>Completed</span
						>
					{:else if isMissed}
						<span
							class="shrink-0 rounded-full bg-red-400 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase"
							>Missed</span
						>
					{:else}
						<span
							class="shrink-0 rounded-full bg-green-400 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase"
							>New</span
						>
					{/if}
				</div>
				<p class="m-0 mb-4 text-base leading-relaxed text-white/95">{job.description}</p>
				<div class="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
					<span class="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold text-white"
						>+{job.points} pts</span
					>
					<span class="text-sm font-semibold text-white/95">
						{#if isMissed}Ended{:else}Due {new Date(job.deadline).toLocaleDateString()}{/if}
					</span>
				</div>
			</div>
		{:else}
			<p class="text-white/80 p-5 text-center italic">No jobs available right now.</p>
		{/each}
	</div>
</div>
