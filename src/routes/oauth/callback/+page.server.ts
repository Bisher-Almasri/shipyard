import { PUBLIC_HC_OAUTH_CLIENT_ID, PUBLIC_HC_OAUTH_REDIRECT_URL } from '$env/static/public';
import { PRIVATE_HC_OAUTH_CLIENT_SECRET } from '$env/static/private';
import { redirect, error } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

interface OAuthResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}

export const load: PageServerLoad = async ({ url, cookies, fetch }) => {
	const code = url.searchParams.get('code');
	const oauthError = url.searchParams.get('error');
	const oauthErrorDesc = url.searchParams.get('error_description');

	if (oauthError) {
		console.error('OAuth error:', oauthError, oauthErrorDesc);
		throw redirect(302, '/-1err');
	}

	if (!code) {
		console.error('No authorization code received');
		throw redirect(302, '/-2err');
	}

	try {
		const params = new URLSearchParams({
			client_id: PUBLIC_HC_OAUTH_CLIENT_ID,
			client_secret: PRIVATE_HC_OAUTH_CLIENT_SECRET,
			redirect_uri: PUBLIC_HC_OAUTH_REDIRECT_URL,
			code,
			grant_type: 'authorization_code'
		});

		const tokenRes = await fetch('https://auth.hackclub.com/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		if (!tokenRes.ok) {
			const text = await tokenRes.text();
			console.error('Token exchange failed:', text);
			throw redirect(302, '/1err');
		}

		const tokenData: OAuthResponse = await tokenRes.json();

		cookies.set('hc_access_token', tokenData.access_token, {
			httpOnly: true,
			path: '/',
			sameSite: 'lax',
			secure: true,
			maxAge: tokenData.expires_in
		});

		cookies.set('hc_refresh_token', tokenData.refresh_token, {
			httpOnly: true,
			path: '/',
			sameSite: 'lax',
			secure: true
		});

		const apiRes = await fetch('https://auth.hackclub.com/api/v1/me', {
			headers: {
				Authorization: `Bearer ${tokenData.access_token}`
			}
		});

		if (!apiRes.ok) {
			const text = await apiRes.text();
			console.error('Failed to fetch user:', text);
			throw redirect(302, '/3err');
		}

		let user = await apiRes.json();
		user = user.identity;
		console.log('Hack Club API User Response:', user);

		const hackclubId = user.slack_id || user.id || Object.values(user)[0]?.toString() || '';
		const name = user.first_name + ' ' + user.last_name || 'Unknown Hacker';
		const email = user.primary_email || '';
		const avatar = `https://cachet.dunkirk.sh/users/${user.slack_id}/r`;

		if (!hackclubId) {
			console.error('Could not determine hackclub_id from response:', user);
			throw redirect(302, '/6err');
		}

		const { data: userData, error: userError } = await supabase
			.from('users')
			.upsert(
				{
					hackclub_id: hackclubId,
					name,
					email,
					avatar,
					address: user.addresses?.[0] || null,
					birthday: user.birthday || null
				},
				{ onConflict: 'hackclub_id' }
			)
			.select()
			.single();

		if (userError || !userData) {
			console.error('Failed to upsert user to Supabase:', userError);
			throw redirect(302, '/4err');
		}

		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 30);

		const { data: sessionData, error: sessionError } = await supabase
			.from('sessions')
			.insert({
				user_id: userData.id,
				expires_at: expiresAt.toISOString()
			})
			.select()
			.single();

		if (sessionError || !sessionData) {
			console.error('Failed to create session in Supabase:', sessionError);
			throw redirect(302, '/5err');
		}

		cookies.set('session_id', sessionData.id, {
			httpOnly: true,
			path: '/',
			sameSite: 'lax',
			secure: true,
			maxAge: 30 * 24 * 60 * 60
		});

		throw redirect(302, '/dashboard/hackatime/connect');
	} catch (e: any) {
		if (e?.status === 302) {
			throw e;
		}
		console.error('OAuth callback crash:', e);
		throw redirect(302, '/2err');
	}
};
