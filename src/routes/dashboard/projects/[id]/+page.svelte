<script lang="ts">
	import { BookOpen, Clock, ArrowLeft, Plus, Pencil, LayoutGrid, Rocket, X, AlertCircle } from 'lucide-svelte';
	import Post from '$lib/components/Post.svelte';
	import { toast } from '$lib/toast';
	import { enhance } from '$app/forms';
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let { data, form: actionForm } = $props();
	let showEditModal = $state(false);

	let parsedDescription = $derived(
		DOMPurify.sanitize(marked.parse(data.project.description || '', { async: false }) as string)
	);

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	$effect(() => {
		if (actionForm?.message && !actionForm.success) {
			toast.error(actionForm.message);
		}
	});
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
				{#if data.project.status === 'rejected'}
					<span
						class="rounded-xl border border-red-400/30 bg-red-400/20 px-3 py-1.5 text-xs font-bold text-red-300"
					>
						Review Rejected
					</span>
				{/if}
				{#if data.project.status === 'pending' || data.project.status === 'rejected' || !data.project.status}
					<form method="POST" action="?/ship" use:enhance class="flex flex-col gap-2">
						{#if data.availableJobs.length > 0}
							<div class="flex items-center gap-2">
								<select
									name="challengeId"
									required
									value={data.project.selected_job_id || ''}
									class="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white transition-all outline-none focus:border-white/40"
								>
									<option value="" disabled>Select Challenge</option>
									{#each data.availableJobs as job}
										<option value={job.id}>{job.title} (+{job.points} pts)</option>
									{/each}
								</select>
								<input
									name="playable_url"
									type="url"
									placeholder="Playable URL (Mandatory)"
									class="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white transition-all outline-none focus:border-white/40"
									value={data.project.playable_url || ''}
									required
								/>
								<button
									type="submit"
									class="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-white no-underline shadow-md transition-all hover:scale-105 hover:bg-green-400 active:scale-95"
								>
									<Rocket size={15} />
									{data.project.status === 'rejected' ? 'Reship!' : 'Ship It!'}
								</button>
							</div>
						{:else}
							<p class="text-[10px] font-bold text-red-300">No challenges available to complete!</p>
						{/if}
					</form>
				{:else if data.project.status === 'shipped'}
					<span
						class="rounded-xl border border-yellow-400/30 bg-yellow-400/20 px-3 py-1.5 text-xs font-bold text-yellow-300"
					>
						Under Review
					</span>
				{:else if data.project.status === 'approved'}
					<span
						class="rounded-xl border border-green-400/30 bg-green-400/20 px-3 py-1.5 text-xs font-bold text-green-300"
					>
						Shipped & Approved ({data.project.multiplier}x)
					</span>
				{/if}
				<button
					onclick={() => (showEditModal = true)}
					class="edit-btn"
					title="Edit project"
					aria-label="Edit project"
				>
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

		{#if data.project.status === 'rejected' && data.project.last_reviewer_message}
			<div class="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 backdrop-blur-md">
				<h3 class="m-0 mb-2 flex items-center gap-2 text-sm font-bold text-red-300">
					<AlertCircle size={16} /> Reviewer Notes
				</h3>
				<p class="m-0 text-sm leading-relaxed text-red-200/90 whitespace-pre-wrap">{data.project.last_reviewer_message}</p>
			</div>
		{/if}

		{#if data.project.description}
			<div class="m-0 mt-5 text-sm leading-relaxed text-white/90 prose prose-invert prose-sm max-w-none prose-p:my-2">
				{@html parsedDescription}
			</div>
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

{#if showEditModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="edit-project-title"
	>
		<div
			class="modal-slide-in w-full max-w-lg rounded-3xl border border-white/20 bg-gradient-to-b from-[#2A68B0] to-[#1F5390] p-6 shadow-2xl"
		>
			<div class="mb-5 flex items-center justify-between">
				<h2 id="edit-project-title" class="m-0 font-marker text-2xl text-white">Edit Project</h2>
				<button
					onclick={() => (showEditModal = false)}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
				>
					<X size={18} />
				</button>
			</div>

			<form
				method="POST"
				action="?/updateProject"
				use:enhance={() => {
					return ({ result }) => {
						if (result.type === 'success') {
							showEditModal = false;
						}
					};
				}}
				class="flex flex-col gap-4"
			>
				<div>
					<label for="edit-title" class="mb-1.5 block text-sm font-bold text-white/75"
						>Project Title</label
					>
					<input
						id="edit-title"
						name="title"
						type="text"
						value={data.project.title}
						required
						class="field-input"
					/>
				</div>
				<div>
					<label for="edit-desc" class="mb-1.5 block text-sm font-bold text-white/75"
						>Description</label
					>
					<textarea id="edit-desc" name="description" rows={3} required class="field-input"
						>{data.project.description}</textarea
					>
				</div>
				<div>
					<label for="edit-repo" class="mb-1.5 block text-sm font-bold text-white/75"
						>Repository URL</label
					>
					<input
						id="edit-repo"
						name="repo_url"
						type="url"
						value={data.project.repo_url || ''}
						required
						class="field-input"
					/>
				</div>
				<div>
					<label for="edit-playable" class="mb-1.5 block text-sm font-bold text-white/75"
						>Playable URL</label
					>
					<input
						id="edit-playable"
						name="playable_url"
						type="url"
						value={data.project.playable_url || ''}
						class="field-input"
					/>
				</div>
				<div class="mt-2 flex gap-3">
					<button
						type="button"
						onclick={() => (showEditModal = false)}
						class="flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 font-bold text-white transition-all hover:bg-white/18"
						>Cancel</button
					>
					<button
						type="submit"
						class="flex-1 rounded-xl bg-white py-2.5 font-bold text-[#1F5390] transition-all hover:scale-[1.02] hover:bg-white/90 active:scale-95"
						>Save Changes</button
					>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.field-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		border: 1.5px solid rgba(255, 255, 255, 0.2);
		border-radius: 14px;
		padding: 0.65rem 1rem;
		color: white;
		font-family: inherit;
		font-size: 0.95rem;
		outline: none;
		transition:
			border-color 0.15s,
			background 0.15s;
		resize: none;
		box-sizing: border-box;
	}
	.field-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}
	.field-input:focus {
		border-color: rgba(184, 228, 255, 0.55);
		background: rgba(255, 255, 255, 0.14);
	}

	.modal-slide-in {
		animation: modal-in 0.2s ease-out;
	}
	@keyframes modal-in {
		from {
			opacity: 0;
			transform: translateY(14px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

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
