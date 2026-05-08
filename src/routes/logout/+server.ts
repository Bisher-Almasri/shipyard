import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('session_id', { path: '/' });
	throw redirect(303, '/');
};

export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete('session_id', { path: '/' });
	throw redirect(303, '/');
};