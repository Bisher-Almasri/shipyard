import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';

let supabaseClient = null;

function getSupabaseClient() {
	if (!supabaseClient) {
		const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
		const supabaseKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;

		if (!supabaseUrl || !supabaseKey) {
			throw new Error('Supabase env vars are required at runtime');
		}

		supabaseClient = createClient(supabaseUrl, supabaseKey);
	}

	return supabaseClient;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
	get(_target, property, receiver) {
		const client = getSupabaseClient();
		const value = Reflect.get(client, property, receiver);

		return typeof value === 'function' ? value.bind(client) : value;
	}
});
