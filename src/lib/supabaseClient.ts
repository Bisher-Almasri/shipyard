import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
	if (!supabaseClient) {
		const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
		const supabaseKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;

		if (!supabaseUrl || !supabaseKey) {
			throw new Error('Supabase service env vars are required at runtime');
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
