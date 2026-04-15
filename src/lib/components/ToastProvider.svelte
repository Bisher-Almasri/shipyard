<script lang="ts">
	import { toast } from '$lib/toast';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { X, CheckCircle, AlertCircle, Info } from 'lucide-svelte';
</script>

<div class="toast-container fixed right-5 bottom-5 z-[9999] flex flex-col gap-3">
	{#each $toast as t (t.id)}
		<div
			animate:flip={{ duration: 300 }}
			in:fly={{ y: 20, duration: 400 }}
			out:fly={{ x: 20, duration: 300 }}
			class="toast-item relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/20 bg-[#1A1C3D]/80 p-4 shadow-2xl backdrop-blur-xl"
		>
			<div class="shrink-0">
				{#if t.type === 'success'}
					<CheckCircle class="text-green-400" size={20} />
				{:else if t.type === 'error'}
					<AlertCircle class="text-red-400" size={20} />
				{:else}
					<Info class="text-blue-400" size={20} />
				{/if}
			</div>

			<p class="max-w-[280px] text-sm font-bold text-white/90">
				{t.message}
			</p>

			<button
				onclick={() => toast.remove(t.id)}
				class="ml-2 rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
			>
				<X size={16} />
			</button>

			<div
				class="absolute bottom-0 left-0 h-1 bg-white/20"
				style:width="0"
				style:animation="progress var(--duration, 3000ms) linear forwards"
				style:--duration="{t.duration}ms"
			></div>
		</div>
	{/each}
</div>

<style>
	@keyframes progress {
		from {
			width: 100%;
		}
		to {
			width: 0%;
		}
	}
</style>
