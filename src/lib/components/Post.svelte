<script lang="ts">
	import { Star, MessageSquare, Clock, Send } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { post, user }: { post: any; user: any } = $props();

	let expandedComments = $state(false);

	function toggleComments() {
		expandedComments = !expandedComments;
	}

	function timeAgo(dateStr: string) {
		if (!dateStr) return 'some time ago';
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

	let isLiked = $derived(post.post_likes.some((l: any) => l.user_id === user?.id));
</script>

<div class="devlog-card">
	<div class="flex items-start gap-3 px-5 pt-5 pb-3">
		<div class="avatar-ring shrink-0">
			<img
				src={(post.project?.user?.avatar || post.user?.avatar) || '/pfp.png'}
				alt="Avatar"
				class="h-full w-full object-cover"
			/>
		</div>
		<div class="min-w-0 flex-1">
			<p class="m-0 text-sm leading-snug font-bold text-white">
				<span class="text-white">{post.project?.user?.name || post.user?.name || 'Anonymous'}</span>
				<span class="font-normal text-white/55"> worked on </span>
				{#if post.project}
					<a
						href="/dashboard/projects/{post.project.id}"
						class="text-[#B8E4FF] no-underline hover:underline"
					>
						{post.project.title}
					</a>
				{:else}
					<span class="text-[#B8E4FF]">this project</span>
				{/if}
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
		<form action="?/like" method="POST" use:enhance>
			<input type="hidden" name="postId" value={post.id} />
			<button class="action-chip {isLiked ? 'liked' : ''}">
				<Star size={14} fill={isLiked ? 'currentColor' : 'none'} />
				<span>{post.post_likes?.length || 0}</span>
			</button>
		</form>
		<button class="action-chip" onclick={toggleComments}>
			<MessageSquare size={14} />
			<span>{post.comments?.length || 0}</span>
		</button>
	</div>

	{#if expandedComments}
		<div class="border-t border-white/5 bg-black/10 px-5 py-4">
			<div class="mb-4 flex flex-col gap-3">
				{#each post.comments || [] as comment}
					<div class="flex gap-3">
						<div class="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5">
							<img
								src={comment.users.avatar || '/pfp.png'}
								alt={comment.users.name}
								class="h-full w-full object-cover"
							/>
						</div>
						<div class="flex-1">
							<div class="flex items-baseline gap-2">
								<span class="text-xs font-bold text-white">{comment.users.name}</span>
								<span class="text-[10px] text-white/30">{timeAgo(comment.created_at)}</span>
							</div>
							<p class="mt-0.5 text-xs text-white/80">{comment.content}</p>
						</div>
					</div>
				{/each}
			</div>

			<form
				action="?/comment"
				method="POST"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							const form = document.getElementById(`comment-form-${post.id}`) as HTMLFormElement;
							form?.reset();
						}
						update();
					};
				}}
				class="flex gap-2"
				id="comment-form-{post.id}"
			>
				<input type="hidden" name="postId" value={post.id} />
				<input
					type="text"
					name="content"
					placeholder="Add a comment..."
					class="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
					required
				/>
				<button
					type="submit"
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
				>
					<Send size={14} />
				</button>
			</form>
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
	.action-chip.liked {
		color: #ffca28;
		background: rgba(255, 202, 40, 0.15);
		border-color: rgba(255, 202, 40, 0.3);
	}
	.action-chip.liked:hover {
		background: rgba(255, 202, 40, 0.25);
	}
</style>
