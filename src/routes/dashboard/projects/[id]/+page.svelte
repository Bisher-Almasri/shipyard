<script lang="ts">
	import { BookOpen, Clock, ArrowLeft, Plus, Pencil, LayoutGrid, Rocket } from 'lucide-svelte';
	import Post from '$lib/components/Post.svelte';
	import { enhance } from '$app/forms';

	let { data } = $props();

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{data.project.title} | Shipyard</title>
	<meta name="description" content="Dev logs for {data.project.title}" />
</svelte:head>

<a
	href="/dashboard/projects"
	class="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-sm font-bold text-white no-underline transition-all hover:bg-white/25 active:scale-95"
>
	<ArrowLeft size={15} />
	Projects
</a>

<div class="project-banner mb-6">
	{#if data.project.header_img}
		<img src={data.project.header_img} alt={data.project.title} class="banner-bg-img" />
	{/if}
	<div class="banner-overlay"></div>

	<div class="banner-content">
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0">
				<h1 class="m-0 font-marker text-3xl leading-tight text-white max-md:text-2xl">
					{data.project.title}
				</h1>
				<p class="m-0 mt-1 text-sm font-bold text-white/90">
					Created by: <span class="text-white/90">{data.user.name}</span>
				</p>
				<div class="mt-2 flex items-center gap-4">
					<span class="stat-chip">
						<BookOpen size={13} />
						{data.posts.length} devlog{data.posts.length !== 1 ? 's' : ''}
					</span>
					<span class="stat-chip">
						<Clock size={13} />
						{formatDate(data.project.created_at)}
					</span>
				</div>
				{#if data.project.hackatime_projects?.length > 0}
					<div class="mt-3 flex flex-wrap gap-2">
						{#each data.project.hackatime_projects as hp}
							<div class="hackatime-tag">
								<LayoutGrid size={11} />
								<span>{hp}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex shrink-0 items-center gap-2">
				{#if data.project.status === 'pending' || !data.project.status}
					<form method="POST" action="?/ship" use:enhance>
						<button
							type="submit"
							class="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-white no-underline shadow-md transition-all hover:scale-105 hover:bg-green-400 active:scale-95"
						>
							<Rocket size={15} />
							Ship It!
						</button>
					</form>
				{:else if data.project.status === 'shipped'}
					<span class="rounded-xl border border-yellow-400/30 bg-yellow-400/20 px-3 py-1.5 text-xs font-bold text-yellow-300">
						Under Review
					</span>
				{:else if data.project.status === 'approved'}
					<span class="rounded-xl border border-green-400/30 bg-green-400/20 px-3 py-1.5 text-xs font-bold text-green-300">
						Shipped & Approved ({data.project.multiplier}x)
					</span>
				{:else if data.project.status === 'rejected'}
					<span class="rounded-xl border border-red-400/30 bg-red-400/20 px-3 py-1.5 text-xs font-bold text-red-300">
						Review Rejected
					</span>
				{/if}
				<button class="edit-btn" title="Edit project" aria-label="Edit project">
					<Pencil size={16} />
				</button>
				<a
					href="/dashboard/projects/{data.project.id}/new"
					id="new-devlog-btn"
					class="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#1F5390] no-underline shadow-md transition-all hover:scale-105 hover:bg-white/90 active:scale-95"
				>
					<Plus size={15} />
					New Dev Log
				</a>
			</div>
		</div>

		{#if data.project.description}
			<p class="m-0 mt-4 text-sm leading-relaxed font-bold text-white/90">
				{data.project.description}
			</p>
		{/if}
	</div>
</div>

<h2 class="m-0 mb-4 font-marker text-2xl text-white drop-shadow-sm">Dev Logs</h2>

{#if data.posts.length === 0}
	<div
		class="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/10 py-16 text-center backdrop-blur-md"
	>
		<BookOpen size={40} class="text-white/25" />
		<p class="m-0 text-lg font-bold text-white/60">No dev logs yet</p>
		<p class="m-0 text-sm text-white/40">Document your progress by adding a dev log entry.</p>
		<a
			href="/dashboard/projects/{data.project.id}/new"
			class="mt-2 flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-[#1F5390] no-underline transition-all hover:scale-105"
		>
			<Plus size={15} />
			Add first log
		</a>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#each data.posts as post}
			<Post {post} user={data.user} />
		{/each}
	</div>
{/if}

<style>
	/* ── Project banner ───────────────────────────────────── */
	.project-banner {
		position: relative;
		border-radius: 22px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		overflow: hidden;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(14px);
		min-height: 148px;
	}

	/* Optional background image fills entire card */
	.banner-bg-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.25;
		pointer-events: none;
	}

	/* Dark gradient overlay so text always reads */
	.banner-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(31, 83, 144, 0.55) 0%, rgba(42, 104, 176, 0.35) 100%);
		pointer-events: none;
	}

	/* Actual content sits above overlay */
	.banner-content {
		position: relative;
		z-index: 1;
		padding: 1.5rem 1.6rem;
	}

	/* Small stat chips */
	.stat-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
	}
	.hackatime-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.6rem;
		border-radius: 8px;
		background: rgba(184, 228, 255, 0.15);
		border: 1px solid rgba(184, 228, 255, 0.25);
		color: #b8e4ff;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	/* Edit button — square glass pill */
	.edit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.25);
		background: rgba(255, 255, 255, 0.15);
		color: white;
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.15s;
		flex-shrink: 0;
	}
	.edit-btn:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.08);
	}
</style>

