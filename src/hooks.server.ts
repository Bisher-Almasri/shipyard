import { type Handle } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');

	if (!sessionId) {
		event.locals.user = null;
		return resolve(event);
	}

	const { data: sessionData, error: sessionError } = await supabase
		.from('sessions')
		.select('*, users(*)')
		.eq('id', sessionId)
		.single();

	if (sessionError || !sessionData) {
		event.cookies.delete('session_id', { path: '/' });
		event.locals.user = null;
		return resolve(event);
	}

	if (new Date(sessionData.expires_at) < new Date()) {
		event.cookies.delete('session_id', { path: '/' });
		event.locals.user = null;
		return resolve(event);
	}

	event.locals.user = sessionData.users;

	const response = await resolve(event);

	// Add basic security headers to all responses
	try {
		response.headers.set('X-Frame-Options', 'DENY');
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade');
		response.headers.set('Permissions-Policy', 'geolocation=(), camera=()');
		if (process.env.NODE_ENV === 'production') {
			response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
		}
	} catch (e) {
		// if headers are immutable or unavailable, do not crash the request
		console.error('Failed to set security headers:', e?.message || e);
	}

	return response;
};
