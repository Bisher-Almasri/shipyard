<script lang="ts">
	import { LayoutGrid, Plus, BookOpen, Clock, X, Upload } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { toast } from '$lib/toast';

	const { data } = $props();

	const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

	let showNewProjectModal = $state(false);
	let fileName = $state('');
	let headerImgUrl = $state('');

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
				target.value = '';
				fileName = '';
				toast.error('Image must be 10 MB or smaller.');
				return;
			}

			fileName = file.name;
			headerImgUrl = '';
		}
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Projects | Shipyard</title>
	<meta name="description" content="Manage your Shipyard projects and dev logs" />
</svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
	<div>
		<h1 class="m-0 font-marker text-4xl text-white max-md:text-3xl">Your Projects</h1>
		<p class="m-0 mt-1 text-base font-bold text-white/70 max-md:text-sm">
			Manage your active builds and deployments
		</p>
	</div>
	<button
		onclick={() => (showNewProjectModal = true)}
		id="new-project-btn"
		class="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-bold text-[#1F5390] shadow-md transition-all hover:scale-105 hover:bg-white/90 active:scale-95"
	>
		<Plus size={18} />
		New Project
	</button>
</div>

{#if data.projects.length === 0}
	<div
		class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/10 py-20 text-center backdrop-blur-md"
	>
		<LayoutGrid size={52} class="text-white/20" />
		<h3 class="m-0 text-2xl font-bold text-white/70">No projects yet</h3>
		<p class="m-0 text-sm text-white/50">
			Start building something awesome and document your journey!
		</p>
		<button
			onclick={() => (showNewProjectModal = true)}
			class="mt-2 flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-bold text-[#1F5390] transition-all hover:scale-105"
		>
			<Plus size={16} />
			Create your first project
		</button>
	</div>
{:else}
	<div class="grid grid-cols-2 gap-4 max-md:grid-cols-1">
		{#each data.projects as project}
			{@const postCount = data.posts.filter((p) => p.project_id === project.id).length}
			<a
				href="/dashboard/projects/{project.id}"
				class="group flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/12 no-underline backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/18 hover:shadow-xl"
			>
				{#if project.header_img}
					<img src={project.header_img} alt={project.title} class="h-36 w-full object-cover" />
				{:else}
					<div
						class="flex h-36 w-full items-center justify-center bg-gradient-to-br from-blue-400/20 to-indigo-600/20"
					>
						<LayoutGrid size={36} class="text-white/25" />
					</div>
				{/if}
				<div class="flex flex-1 flex-col p-5">
					<div class="mb-2 flex items-start justify-between gap-3">
						<h3 class="m-0 text-xl font-bold text-white">{project.title}</h3>
						<span
							class="shrink-0 rounded-full bg-green-400/20 px-2 py-0.5 text-xs font-bold text-green-300"
							>Active</span
						>
					</div>
					<p class="m-0 mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-white/70">
						{project.description}
					</p>
					<div class="flex items-center gap-4 border-t border-white/10 pt-3 text-xs text-white/50">
						<span class="flex items-center gap-1.5">
							<BookOpen size={12} />
							{postCount} log{postCount !== 1 ? 's' : ''}
						</span>
						<span class="flex items-center gap-1.5">
							<Clock size={12} />
							{formatDate(project.created_at)}
						</span>
					</div>
				</div>
			</a>
		{/each}
	</div>
{/if}

{#if showNewProjectModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="new-project-title"
	>
		<div
			class="modal-slide-in w-full max-w-lg rounded-3xl border border-white/20 bg-gradient-to-b from-[#2A68B0] to-[#1F5390] p-6 shadow-2xl"
		>
			<div class="mb-5 flex items-center justify-between">
				<h2 id="new-project-title" class="m-0 font-marker text-2xl text-white">New Project</h2>
				<button
					onclick={() => (showNewProjectModal = false)}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
				>
					<X size={18} />
				</button>
			</div>

			<form
				method="POST"
				action="?/createProject"
				use:enhance={() => {
					return ({ update }) => {
						update({ reset: true });
						showNewProjectModal = false;
						fileName = '';
						headerImgUrl = '';
					};
				}}
				enctype="multipart/form-data"
				class="flex flex-col gap-4"
			>
				<div>
					<label for="proj-title" class="mb-1.5 block text-sm font-bold text-white/75">
						Project Title <span class="text-red-300">*</span>
					</label>
					<input
						id="proj-title"
						name="title"
						type="text"
						required
						placeholder="e.g. Cosmic Dashboard SDK"
						class="field-input"
					/>
				</div>
				<div>
					<label for="proj-desc" class="mb-1.5 block text-sm font-bold text-white/75">
						Description <span class="text-red-300">*</span>
					</label>
					<textarea
						id="proj-desc"
						name="description"
						required
						rows={3}
						placeholder="Describe what you're building…"
						class="field-input"
					></textarea>
				</div>
				<div>
					<label for="proj-repo" class="mb-1.5 block text-sm font-bold text-white/75">
						Repository URL <span class="text-xs font-normal text-white/35">(optional)</span>
					</label>
					<input
						id="proj-repo"
						name="repo_url"
						type="url"
						placeholder="https://github.com/my/project"
						class="field-input"
					/>
				</div>
				<div>
					<label for="proj-playable" class="mb-1.5 block text-sm font-bold text-white/75">
						Playable URL <span class="text-xs font-normal text-white/35">(optional)</span>
					</label>
					<input
						id="proj-playable"
						name="playable_url"
						type="url"
						placeholder="https://my-game.vercel.app"
						class="field-input"
					/>
				</div>
				<div>
					<label for="hackatime-select" class="mb-1.5 block text-sm font-bold text-white/75">
						Link Hackatime Projects <span class="text-red-300">*</span>
					</label>
					<select
						id="hackatime-select"
						name="hackatime_projects"
						multiple
						required
						class="field-input h-32 px-2 py-1"
					>
						{#each data.hackatimeProjects as hproject}
							<option
								value={hproject.name}
								class="rounded-lg px-2 py-1.5 font-semibold hover:bg-white/10"
							>
								{hproject.name}
							</option>
						{:else}
							<option disabled>No projects found since March 20th</option>
						{/each}
					</select>
					<p class="mt-2 text-[10px] font-medium tracking-wider text-white/30 uppercase">
						Hold Cmd (Mac) or Ctrl (Windows) to select multiple
					</p>
				</div>
				<div>
					<label for="proj-img" class="mb-1.5 block text-sm font-bold text-white/75">
						Header Image <span class="text-xs font-normal text-white/35">(optional)</span>
					</label>
					<div class="attachment-group">
						<input
							id="proj-img"
							name="header_img"
							type="url"
							placeholder="Paste an image URL…"
							class="field-input rounded-b-none border-b-0"
							bind:value={headerImgUrl}
						/>
						<div class="file-upload-zone">
							<input
								id="proj-image"
								name="image"
								type="file"
								accept="image/*"
								class="hidden"
								onchange={handleFileChange}
							/>
							<label for="proj-image" class="file-upload-label">
								<Upload size={14} />
								<span>{fileName || 'Or Upload File'}</span>
							</label>
						</div>
					</div>
				</div>
				<div class="mt-2 flex gap-3">
					<button
						type="button"
						onclick={() => (showNewProjectModal = false)}
						class="flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 font-bold text-white transition-all hover:bg-white/18"
						>Cancel</button
					>
					<button
						type="submit"
						class="flex-1 rounded-xl bg-white py-2.5 font-bold text-[#1F5390] transition-all hover:scale-[1.02] hover:bg-white/90 active:scale-95"
						>Create Project</button
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

	.attachment-group {
		display: flex;
		flex-direction: column;
		border-radius: 14px;
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
		padding: 0.5rem;
		cursor: pointer;
		font-size: 0.8rem;
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
</style>
