import { supabase } from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { data: users, error } = await supabase
		.from('users')
		.select('name, avatar, cargo_points')
		.order('cargo_points', { ascending: false })
		.limit(10);

	if (error) {
		return {
			users: []
		};
	}

	return {
		users: users || []
	};
};
