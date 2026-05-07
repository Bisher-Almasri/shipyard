import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from './$types';

import { env as publicEnv } from '$env/dynamic/public';

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const { data: connection } = await supabase
		.from('hackatime_connections')
		.select('user_id')
		.eq('user_id', locals.user.id)
		.single();

	if (connection) {
		throw redirect(302, '/dashboard');
	}
	const state = Math.random().toString(36).substring(7);
	cookies.set('hackatime_state', state, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 5
	});

	const redirectUri = new URL('/dashboard/hackatime/callback', url.origin).toString();

	const params = new URLSearchParams({
		client_id: publicEnv.PUBLIC_HACKATIME_CLIENT_UID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'profile read',
		state
	});

	throw redirect(302, `https://hackatime.hackclub.com/oauth/authorize?${params.toString()}`);
};
