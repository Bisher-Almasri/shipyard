<script lang="ts">
	import { page } from '$app/state';
	import { House, LayoutGrid, Trophy, ShoppingCart, Compass } from 'lucide-svelte';

	const { data, children } = $props();

	const navItems = [
		{ icon: House, label: 'Home', href: '/dashboard' },
		{ icon: LayoutGrid, label: 'Projects', href: '/dashboard/projects' },
		{ icon: Compass, label: 'Explore', href: '/dashboard/explore' },
		{ icon: Trophy, label: 'Leaderboard', href: '/dashboard/leaderboard' },
		{ icon: ShoppingCart, label: 'Shop', href: '/dashboard/shop' }
	];
</script>

<div
	class="flex min-h-screen w-full items-center justify-center p-4 font-gaegu"
	style="
    background: linear-gradient(
      180deg,
      #3BB1FF 0%,
      #339AD0 15%,
      #3070BA 41.83%,
      #2A68B0 52.41%,
      #235C9F 71.64%,
      #1F5390 87.98%
    );
    background-attachment: fixed;
  "
>
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<img
			src="/Bubble1.svg"
			alt=""
			class="bubble-float absolute top-[10%] left-[5%] h-16 w-16 opacity-60"
		/>
		<img
			src="/Bubble2.svg"
			alt=""
			class="bubble-float absolute top-[20%] right-[10%] h-24 w-24 opacity-60"
			style="animation-delay: 1s;"
		/>
		<img
			src="/Bubble3.svg"
			alt=""
			class="bubble-float absolute top-[60%] left-[15%] h-12 w-12 opacity-60"
			style="animation-delay: 2s;"
		/>
		<img
			src="/Bubble1.svg"
			alt=""
			class="bubble-float absolute right-[20%] bottom-[20%] h-20 w-20 opacity-60"
			style="animation-delay: 1.5s;"
		/>
		<img
			src="/Bubble2.svg"
			alt=""
			class="bubble-float absolute top-[40%] right-[5%] h-10 w-10 opacity-60"
			style="animation-delay: 0.5s;"
		/>
		<img
			src="/Bubble3.svg"
			alt=""
			class="bubble-float absolute bottom-[10%] left-[25%] h-14 w-14 opacity-60"
			style="animation-delay: 2.5s;"
		/>
	</div>

	<div class="relative z-10 flex h-[95vh] w-full max-w-[95vw] gap-4">
		<aside
			class="flex w-16 min-w-16 flex-col items-center justify-between rounded-2xl border-2 border-[#B8E4FF] bg-[#d1ebf9] p-3 shadow-lg max-md:sticky max-md:bottom-3 max-md:z-50 max-md:order-2 max-md:w-full max-md:min-w-full max-md:flex-row max-md:rounded-xl max-md:p-2.5"
		>
			<nav
				class="flex flex-col items-center gap-2 max-md:flex-1 max-md:flex-row max-md:justify-around"
			>
				{#each navItems as item}
					<a
						href={item.href}
						class="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border-none bg-transparent text-[#1F5390] no-underline transition-all duration-200 hover:scale-105 hover:bg-[#4FA4FF]/15 max-md:h-10 max-md:w-10"
						class:active={page.url.pathname === item.href}
						aria-label={item.label}
						title={item.label}
					>
						<item.icon size={28} strokeWidth={2} />
					</a>
				{/each}
			</nav>

			<a
				href="/dashboard/profile"
				class="flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-[#B8E4FF] bg-[#3BB1FF] transition-all duration-200 hover:scale-105 max-md:h-10 max-md:w-10 max-md:rounded-lg"
				aria-label="Profile"
			>
				<img
					src={data.user.avatar || '/pfp.png'}
					alt="Profile"
					class="h-full w-full object-cover"
				/>
			</a>
		</aside>

		<main class="flex min-h-0 min-w-0 flex-1 max-md:order-1">
			<div class="flex h-full flex-1 flex-col overflow-hidden rounded-3xl p-1">
				<div class="h-full overflow-y-auto rounded-2xl p-8 max-md:p-5">
					{@render children()}
				</div>
			</div>
		</main>
	</div>
</div>

<style>
	.active {
		background: #4fa4ff;
		color: white;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.bubble-float {
		animation: bubble-float 10s ease-in-out infinite;
	}

	@keyframes bubble-float {
		0% {
			transform: translate(0, 0);
		}
		33% {
			transform: translate(15px, -25px);
		}
		66% {
			transform: translate(-15px, -15px);
		}
		100% {
			transform: translate(0, 0);
		}
	}
</style>
