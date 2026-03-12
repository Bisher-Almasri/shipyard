<script lang="ts">
	import { Star, MessageSquare, Clock } from 'lucide-svelte';

	const { data } = $props();

	function timeAgo(dateStr: string) {
		const now = new Date();
		const then = new Date(dateStr);
		const diffMs = now.getTime() - then.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);
		const diffMonths = Math.floor(diffDays / 30);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 30) return `${diffDays}d ago`;
		return `${diffMonths}mo ago`;
	}
</script>

<svelte:head>
	<title>Explore | Shipyard</title>
	<meta name="description" content="Discover what others are building in the Shipyard" />
</svelte:head>

<div class="text-center">
	<h1 class="m-0 mb-2 font-marker text-4xl text-white max-md:text-3xl">Explore</h1>
	<p class="m-0 mb-8 text-xl font-bold text-white max-md:mb-6 max-md:text-base">
		Discover what others are building in the Shipyard
	</p>
</div>

<div class="flex flex-col gap-4">
	{#each data.posts as post}
		<div class="devlog-card">
			<div class="flex items-start gap-3 px-5 pt-5 pb-3">
				<div class="avatar-ring shrink-0">
					<img
						src={post.project.user.avatar || '/pfp.png'}
						alt="Avatar"
						class="h-full w-full object-cover"
					/>
				</div>
				<div class="min-w-0 flex-1">
					<p class="m-0 text-sm leading-snug font-bold text-white">
						<span class="text-white">{post.project.user.name}</span>
						<span class="font-normal text-white/55"> worked on </span>
						<a
							href="/dashboard/projects/{post.project.id}"
							class="text-[#B8E4FF] no-underline hover:underline"
						>
							{post.project.title}
						</a>
					</p>
					<div class="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-white/40">
						<Clock size={11} />
						{timeAgo(post.created_at)}
					</div>
				</div>
			</div>

			<div class="px-5 pb-3">
				<h3 class="m-0 mb-2 text-base font-bold text-white">{post.title}</h3>
				<p class="m-0 text-sm leading-relaxed text-white/80">{post.description}</p>

				{#if post.attachment}
					<div class="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">
						<img
							src={post.attachment}
							alt="Devlog attachment"
							class="block max-h-72 w-full object-cover"
							onerror={(e) => {
								(e.target as HTMLImageElement).parentElement!.style.display = 'none';
							}}
						/>
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-2 border-t border-white/10 px-5 py-3">
				<button class="action-chip">
					<Star size={14} />
					<span>{post.likes ?? 0}</span>
				</button>
				<button class="action-chip">
					<MessageSquare size={14} />
					<span>0</span>
				</button>
			</div>
		</div>
	{/each}

	{#if data.posts.length === 0}
		<div class="py-20 text-center">
			<p class="text-white/50">No devlogs found yet. Be the first to post!</p>
		</div>
	{/if}
</div>

<style>
	.devlog-card {
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(12px);
		overflow: hidden;
		transition:
			border-color 0.25s,
			background 0.25s,
			transform 0.25s;
	}
	.devlog-card:hover {
		border-color: rgba(255, 255, 255, 0.28);
		background: rgba(255, 255, 255, 0.14);
		transform: translateY(-2px);
	}

	.avatar-ring {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 2px solid rgba(184, 228, 255, 0.55);
		overflow: hidden;
		box-shadow: 0 0 0 3px rgba(75, 161, 255, 0.18);
		background: rgba(255, 255, 255, 0.15);
		flex-shrink: 0;
	}

	.action-chip {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 999px;
		padding: 0.25rem 0.7rem;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.15s;
	}
	.action-chip:hover {
		background: rgba(255, 255, 255, 0.18);
		color: white;
		transform: scale(1.05);
	}
</style>
