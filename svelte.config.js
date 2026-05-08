import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],

	kit: {
		adapter: adapter({
			bodySize: 10 * 1024 * 1024 // 10MB limit for large image uploads
		}),
		csrf: {
			trustedOrigins: ['https://slack.com', 'https://app.slack.com']
		}
	},
	extensions: ['.svelte', '.svx']
};

export default config;
