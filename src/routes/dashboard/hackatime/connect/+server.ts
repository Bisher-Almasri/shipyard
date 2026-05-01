import {
	PUBLIC_HACKATIME_CLIENT_UID,
	PUBLIC_HACKATIME_OAUTH_REDIRECT_URL
} from '$env/static/public';
import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, locals }) => {
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

	const params = new URLSearchParams({
		client_id: PUBLIC_HACKATIME_CLIENT_UID,
		redirect_uri: PUBLIC_HACKATIME_OAUTH_REDIRECT_URL,
		response_type: 'code',
		scope: 'profile read',
		state
	});

	throw redirect(302, `https://hackatime.hackclub.com/oauth/authorize?${params.toString()}`);
};
