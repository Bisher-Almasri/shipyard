<script lang="ts">
	import { ArrowLeft, FileText, Image as ImageIcon } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	const { data } = $props();
</script>

<svelte:head>
	<title>New Dev Log — {data.project.title} | Shipyard</title>
	<meta name="description" content="Add a dev log entry for {data.project.title}" />
</svelte:head>

<a
	href="/dashboard/projects/{data.project.id}"
	class="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-sm font-bold text-white no-underline transition-all hover:bg-white/25 active:scale-95"
>
	<ArrowLeft size={15} />
	Back to {data.project.title}
</a>

<div class="mb-6 text-center">
	<h1 class="m-0 font-marker text-4xl text-white max-md:text-3xl">New Dev Log</h1>
	<p class="m-0 mt-2 text-base font-bold text-white/60">
		Logging for <span class="text-[#B8E4FF]">{data.project.title}</span>
	</p>
</div>

<div class="mx-auto max-w-xl rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
	<form method="POST" use:enhance class="flex flex-col gap-5">
		<div>
			<label for="post-title" class="mb-1.5 block text-sm font-bold text-white/75">
				Entry Title <span class="text-red-300">*</span>
			</label>
			<input
				id="post-title"
				name="title"
				type="text"
				required
				placeholder="e.g. Added authentication flow"
				class="field-input"
			/>
		</div>

		<div>
			<div class="section-label-bar">
				<FileText size={13} />
				<span>Devlog Text</span>
			</div>
			<textarea
				id="post-desc"
				name="description"
				required
				rows={6}
				placeholder="Write a few sentences about what you worked on..."
				class="field-input rounded-tl-none"
			></textarea>
		</div>

		<div>
			<div class="section-label-bar cyan">
				<ImageIcon size={13} />
				<span>Attachment</span>
			</div>
			<input
				id="post-attach"
				name="attachment"
				type="url"
				placeholder="Paste a screenshot, demo, or video URL…"
				class="field-input rounded-tl-none"
			/>
			<p class="mt-2 text-xs leading-snug text-white/35">
				Show your project's output — screenshots, demo links, videos, etc. Screenshots of just a
				code editor won't be accepted.
			</p>
		</div>

		<div class="flex items-center gap-3 pt-1">
			<a
				href="/dashboard/projects/{data.project.id}"
				class="flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 text-center font-bold text-white no-underline transition-all hover:bg-white/18"
			>
				Cancel
			</a>
			<button
				type="submit"
				id="submit-devlog-btn"
				class="flex-1 rounded-xl bg-white py-2.5 font-bold text-[#1F5390] transition-all hover:scale-[1.02] hover:bg-white/90 active:scale-95"
			>
				Post Log
			</button>
		</div>
	</form>
</div>

<style>
	.field-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		border: 1.5px solid rgba(255, 255, 255, 0.2);
		border-radius: 14px;
		padding: 0.7rem 1rem;
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

	/* Section label tab — sits flush above the input */
	.section-label-bar {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: rgba(255, 255, 255, 0.18);
		border: 1.5px solid rgba(255, 255, 255, 0.25);
		border-bottom: none;
		border-radius: 10px 10px 0 0;
		padding: 0.3rem 0.85rem;
		font-size: 0.75rem;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.9);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.section-label-bar.cyan {
		background: rgba(103, 232, 249, 0.15);
		border-color: rgba(103, 232, 249, 0.3);
		color: #a5f3fc;
	}
</style>
