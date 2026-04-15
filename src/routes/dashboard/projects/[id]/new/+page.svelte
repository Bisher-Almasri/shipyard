<script lang="ts">
	import { ArrowLeft, FileText, Image as ImageIcon, Upload, Clock } from 'lucide-svelte';
	import { toast } from '$lib/toast';
	import { enhance } from '$app/forms';

	let { data, form: actionForm } = $props();

	let fileName = $state('');
	let attachmentUrl = $state('');

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			fileName = target.files[0].name;
			attachmentUrl = ''; 
		}
	}

	$effect(() => {
		if (actionForm?.error) {
			toast.error(actionForm.error);
		}
	});
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

{#if data.project}
	<div class="mb-6 text-center">
		<h1 class="m-0 font-marker text-4xl text-white max-md:text-3xl">New Dev Log</h1>
		<p class="m-0 mt-2 text-base font-bold text-white/60">
			Logging for <span class="text-[#B8E4FF]">{data.project.title}</span>
		</p>
	</div>
{/if}

<div class="mx-auto max-w-xl rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
	<form method="POST" use:enhance enctype="multipart/form-data" class="flex flex-col gap-5">
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
				class="field-input rounded-[14px]"
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
				class="field-input rounded-tl-none rounded-[14px]"
			></textarea>
		</div>

		<div class="rounded-xl border border-blue-400/20 bg-blue-400/10 p-4">
			<div class="flex items-center gap-2 mb-1">
				<Clock size={16} class="text-blue-300" />
				<span class="text-sm font-bold text-white">Automated Time Tracking</span>
			</div>
			<p class="text-xs text-white/60 leading-relaxed">
				Current session: <span class="font-bold text-blue-200">{data.suggestedHours}h</span> will be logged from your linked Hackatime projects.
			</p>
		</div>

		<div>
			<div class="section-label-bar cyan">
				<ImageIcon size={13} />
				<span>Attachment <span class="text-red-300">*</span></span>
			</div>
			<div class="attachment-group">
				<input
					id="post-attach"
					name="attachment"
					type="url"
					placeholder="Paste a screenshot URL..."
					class="field-input"
					bind:value={attachmentUrl}
				/>
				<div class="file-upload-zone">
					<input
						id="post-image"
						name="image"
						type="file"
						accept="image/*"
						class="hidden"
						onchange={handleFileChange}
					/>
					<label for="post-image" class="file-upload-label">
						<Upload size={14} />
						<span>{fileName || 'Or Upload Image Instead'}</span>
					</label>
				</div>
			</div>
			<p class="mt-2 text-xs leading-snug text-white/35">
				Show your project's output. A dev log MUST have an image or screenshot to be valid for shipping.
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

	.attachment-group {
		display: flex;
		flex-direction: column;
		border-radius: 0 14px 14px 14px;
		overflow: hidden;
		border: 1.5px solid rgba(255, 255, 255, 0.2);
	}

	.attachment-group .field-input {
		border: none;
		border-radius: 0;
	}

	.file-upload-zone {
		background: rgba(255, 255, 255, 0.05);
		border-top: 1px dashed rgba(255, 255, 255, 0.2);
		transition: background 0.15s;
	}

	.file-upload-zone:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.file-upload-label {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.6);
		transition: color 0.15s;
	}

	.file-upload-label:hover {
		color: white;
	}

	.hidden {
		display: none;
	}
</style>
