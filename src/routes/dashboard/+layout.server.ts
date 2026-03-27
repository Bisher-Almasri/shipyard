import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	if (url.pathname.startsWith('/dashboard/hackatime')) {
		return { user: locals.user };
	}

	const { data: connection } = await supabase
		.from('hackatime_connections')
		.select('user_id')
		.eq('user_id', locals.user.id)
		.single();

	if (!connection) {
		throw redirect(302, '/dashboard/hackatime/connect');
	}

	return {
		user: locals.user
	};
};
