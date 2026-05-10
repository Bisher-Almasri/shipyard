import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
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
		const redirectUri = new URL('/oauth/callback', url.origin).toString();
		const isSecure = url.protocol === 'https:';

		const params = new URLSearchParams({
			client_id: publicEnv.PUBLIC_HC_OAUTH_CLIENT_ID,
			client_secret: privateEnv.PRIVATE_HC_OAUTH_CLIENT_SECRET,
			redirect_uri: redirectUri,
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
			secure: isSecure,
			maxAge: tokenData.expires_in
		});

		cookies.set('hc_refresh_token', tokenData.refresh_token, {
			httpOnly: true,
			path: '/',
			sameSite: 'lax',
			secure: isSecure
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
		
		let slackName = name;
		if (user.slack_id) {
			const { getSlackUsername } = await import('$lib/server/slack');
			const fetchedSlackName = await getSlackUsername(user.slack_id);
			if (fetchedSlackName) {
				slackName = fetchedSlackName;
			}
		}

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
			secure: isSecure,
			maxAge: 30 * 24 * 60 * 60
		});

		throw redirect(302, '/dashboard/hackatime/connect');
	} catch (e: any) {
		if (e?.status === 302) {
			throw e;
		}
		console.error('OAuth callback crash:', e, e?.stack);
		throw redirect(302, '/2err');
	}
};
