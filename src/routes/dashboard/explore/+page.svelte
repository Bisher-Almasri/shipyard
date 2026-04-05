<script lang="ts">
	import Post from '$lib/components/Post.svelte';

	let { data } = $props();
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
		<Post {post} user={data.user} />
	{/each}

	{#if data.posts.length === 0}
		<div class="py-20 text-center">
			<p class="text-white/50">No devlogs found yet. Be the first to post!</p>
		</div>
	{/if}
</div>

