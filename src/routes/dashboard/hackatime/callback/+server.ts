import { PUBLIC_HACKATIME_OAUTH_REDIRECT_URL } from '$env/static/public';
import { redirect, error } from '@sveltejs/kit';
import { exchangeCodeForToken } from '$lib/server/hackatime';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const oauthError = url.searchParams.get('error');

	const savedState = cookies.get('hackatime_state');
	cookies.delete('hackatime_state', { path: '/' });

	if (state !== savedState) {
		console.error('Hackatime state mismatch');
		throw redirect(302, '/dashboard?error=state_mismatch');
	}

	if (oauthError) {
		console.error('Hackatime OAuth error:', oauthError);
		throw redirect(302, '/dashboard?error=hackatime_auth_failed');
	}

	if (!code) {
		console.error('No authorization code received from Hackatime');
		throw redirect(302, '/dashboard?error=no_code');
	}

	if (!locals.user) {
		throw redirect(302, '/');
	}

	try {
		const tokenData = await exchangeCodeForToken(code, PUBLIC_HACKATIME_OAUTH_REDIRECT_URL);

		const { error: dbError } = await supabase
			.from('hackatime_connections')
			.upsert({
				user_id: locals.user.id,
				access_token: tokenData.access_token,
				updated_at: new Date().toISOString()
			});

		if (dbError) {
			console.error('Failed to store Hackatime token:', dbError);
			throw error(500, 'Failed to store Hackatime connection');
		}

		throw redirect(302, '/dashboard?success=hackatime_connected');
	} catch (e: any) {
		if (e?.status === 302) throw e;
		console.error('Hackatime callback crash:', e);
		throw error(500, 'An unexpected error occurred during Hackatime connection');
	}
};
