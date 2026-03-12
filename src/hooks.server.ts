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

	return resolve(event);
};
