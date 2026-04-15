import { createClient } from '@supabase/supabase-js';

// Fallback for standalone scripts (like Bun) where SvelteKit's $env isn't available
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

if (!supabaseUrl || !supabaseKey) {
	console.warn('Supabase credentials missing. If you are running a standalone script, ensure your .env is loaded.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
