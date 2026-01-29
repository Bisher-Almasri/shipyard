<script lang="ts">
	import { onMount } from 'svelte';
</script>

<div
	class="min-h-screen overflow-x-hidden scroll-smooth font-gaegu text-white selection:bg-yellow-400 selection:text-black"
>
	<section
		class="relative overflow-hidden bg-[#94D8FF] px-8 pt-12 pb-24 md:px-16 md:pt-24 md:pb-48"
	>
		<div class="absolute top-0 left-0 z-40 w-32 md:w-48">
			<img src="/flag-orpheus-top.svg" alt="Hack Club Flag" class="w-full" />
		</div>

		<div
			class="relative z-30 container mx-auto flex flex-col items-center justify-between md:flex-row"
		>
			<div class="mt-24 max-w-xl text-center md:mt-0 md:text-left">
				<h1
					class="mb-6 -rotate-2 transform font-marker text-7xl text-black select-none md:text-9xl"
				>
					Shipyard
				</h1>
				<p class="mb-10 text-2xl leading-relaxed font-bold text-black/80 md:text-3xl">
					Lorem ipsum dolor sit amet,<br />consectetur adipiscing elit.
				</p>
				<button
					class="rounded-xl bg-[#4FA4FF] px-10 py-4 text-3xl font-bold text-white shadow-[0px_6px_0px_0px_#2d7fd5] transition-all hover:translate-y-1 hover:bg-[#3d93ef] hover:shadow-none active:translate-y-1.5 active:shadow-none"
					onclick={() => {
						window.open("https://shipyard.fillout.com/rsvp", "_blank");
					}}
				>
					RSVP Now!
				</button>
			</div>
		</div>

		<div
			class="ship-sailing pointer-events-none absolute right-[5%] bottom-[10px] z-10 w-[70%] opacity-90 md:right-[10%] md:bottom-[20px] md:w-[40%]"
		>
			<img src="/tall-ship.svg" alt="Tall Ship" class="h-auto w-full drop-shadow-2xl" />
		</div>

		<div class="absolute bottom-0 left-0 z-20 w-full overflow-hidden leading-none">
			<div class="wave-container">
				<svg
					class="wave-anim relative block h-[120px] w-[200%] md:h-[200px]"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 1200 120"
					preserveAspectRatio="none"
				>
					<path
						d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28.14,70.36-5.37,136.33-33.31,206.8-37.5,73.84-4.36,147.54,16.88,218.2,35.26,69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V120H0Z"
						class="fill-[#3BB1FF]"
					></path>
				</svg>
			</div>
		</div>
	</section>

	<div class="relative z-20 w-full bg-[#3BB1FF]">
		<img src="/BubbleDivider.png" alt="Bubble Divider" class="h-full w-full object-cover" />
	</div>

	<section class="relative overflow-hidden px-8 pt-10 pb-10" style="
    background: linear-gradient(
      180deg,
      #3BB1FF 0%,
      #339AD0 15%,
      #3070BA 41.83%,
      #2A68B0 52.41%,
      #235C9F 71.64%,
      #1F5390 87.98%
    );
  ">
		<div class="relative z-10 container mx-auto text-center">
			<div class="mb-32">
				<h2 class="mb-8 font-marker text-5xl italic md:text-6xl">What is Shipyard?</h2>
				<p class="mx-auto max-w-4xl text-xl leading-relaxed md:text-2xl">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet,
					consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet,
					consectetur adipiscing elit.
				</p>
			</div>

			<div class="mb-20">
				<h2 class="mb-16 font-marker text-5xl italic md:text-6xl">How does Shipyard work?</h2>
				<div class="relative mx-auto flex max-w-3xl flex-col gap-12 text-left">
					<div class="relative z-10 w-full md:w-[80%]">
						<div
							class="-rotate-1 transform rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md transition-all duration-300 hover:rotate-0"
						>
							<h3 class="mb-4 font-marker text-3xl">Challenge Arrival</h3>
							<p class="text-xl opacity-90">
								Lorem ipsum dolor sit amet, consectetur adipiscing elit.
							</p>
						</div>
					</div>

					<div class="relative z-10 w-full self-end md:w-[80%]">
						<div class="absolute -top-10 -left-20 flex gap-2 opacity-40">
							<div class="bubble-float h-8 w-8 rounded-full bg-blue-300"></div>
							<div
								class="bubble-float mt-4 h-16 w-16 rounded-full bg-blue-300"
								style="animation-delay: 1s;"
							></div>
							<div
								class="bubble-float mt-10 h-10 w-10 rounded-full bg-blue-300"
								style="animation-delay: 2s;"
							></div>
						</div>
						<div
							class="rotate-1 transform rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md transition-all duration-300 hover:rotate-0"
						>
							<h3 class="mb-4 font-marker text-3xl">Create and Submit Solution</h3>
							<p class="text-xl opacity-90">
								Lorem ipsum dolor sit amet, consectetur adipiscing elit.
							</p>
						</div>
					</div>

					<div class="relative z-10 w-full md:w-[80%]">
						<div
							class="-rotate-1 transform rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md transition-all duration-300 hover:rotate-0"
						>
							<h3 class="mb-4 font-marker text-3xl">Spend Your Points</h3>
							<p class="text-xl opacity-90">
								Lorem ipsum dolor sit amet, consectetur adipiscing elit.
							</p>
						</div>

						<div class="absolute -right-10 -bottom-10 flex flex-col gap-2 opacity-40">
							<div class="bubble-float h-16 w-16 rounded-full bg-blue-300"></div>
							<div class="flex gap-2">
								<div
									class="bubble-float h-10 w-10 rounded-full bg-blue-300"
									style="animation-delay: 1.5s;"
								></div>
								<div
									class="bubble-float h-6 w-6 rounded-full bg-blue-300"
									style="animation-delay: 0.5s;"
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>


		<div class="relative z-10 container mx-auto px-8 pt-20 pb-40">
			<h2 class="mb-16 text-center font-marker text-5xl uppercase italic md:text-6xl">FAQ</h2>

			<div class="mx-auto mb-8 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
				<div
					class="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-md transition-transform hover:scale-[1.02]"
				>
					<h3 class="mb-4 font-marker text-3xl uppercase">LOREM IPSUM</h3>
					<p class="text-xl opacity-90">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
				</div>
				<div
					class="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-md transition-transform hover:scale-[1.02]"
				>
					<h3 class="mb-4 font-marker text-3xl uppercase">LOREM IPSUM</h3>
					<p class="text-xl opacity-90">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
				</div>
			</div>
			<div class="mx-auto max-w-5xl">
				<div
					class="rounded-2xl border border-white/20 bg-white/10 p-8 text-center backdrop-blur-md transition-transform hover:scale-[1.01]"
				>
					<h3 class="mb-4 font-marker text-3xl uppercase">LOREM IPSUM</h3>
					<p class="text-xl opacity-90">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
				</div>
			</div>
		</div>

		<div class="absolute bottom-0 left-0 z-0 w-full leading-none">
			<svg
				class="relative block h-[120px] w-full"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 1200 120"
				preserveAspectRatio="none"
			>
				<path
					d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28.14,70.36-5.37,136.33-33.31,206.8-37.5,73.84-4.36,147.54,16.88,218.2,35.26,69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V120H0Z"
					class="fill-[#1A5276]"
				></path>
			</svg>
		</div>
	</section>

	<footer class="relative overflow-hidden bg-[#1A5276] px-8 py-32 text-center">
		<div class="relative z-10 container mx-auto">
			<h2 class="mb-12 font-marker text-7xl uppercase italic md:text-8xl">READY?</h2>
			<button
				class="mb-32 rounded-2xl bg-[#2d7fd5] px-12 py-5 text-4xl font-bold text-white shadow-[0px_6px_0px_0px_#143d5c] transition-all hover:bg-[#3d93ef] active:translate-y-1 active:shadow-none"
				onclick={() => {
					window.open("https://shipyard.fillout.com/rsvp", "_blank");
				}}
			>
				RSVP Now!
			</button>

			<div class="mt-20 flex flex-col items-center gap-4">
				<div class="flex items-center gap-4 text-xl font-bold opacity-80 md:text-2xl">
					<span>Shipyard is from</span>
					<img
						src="/flag-standalone.svg"
						alt="Hack Club Logo"
						class="h-10 transition-transform hover:scale-110"
					/>
					<span>For teens by teens.</span>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.ship-sailing {
		animation: ship-ride 10s ease-in-out infinite;
		transform-origin: bottom center;
	}

	@keyframes ship-ride {
		0%,
		100% {
			transform: translateY(0px) rotate(2deg);
		}
		25% {
			transform: translateY(15px) rotate(4deg) translateX(-10px);
		}
		50% {
			transform: translateY(-5px) rotate(2deg) translateX(0px);
		}
		75% {
			transform: translateY(10px) rotate(0deg) translateX(10px);
		}
	}

	/* Wave Animation */
	.wave-anim {
		animation: wave-slide 25s linear infinite;
	}

	@keyframes wave-slide {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}

	.wave-container {
		width: 200%;
		display: flex;
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
