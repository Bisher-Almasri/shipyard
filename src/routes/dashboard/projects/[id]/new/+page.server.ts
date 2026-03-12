import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { fail, redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;

	const { data: project } = await supabase
		.from('projects')
		.select('id, title')
		.eq('id', params.id)
		.eq('user_id', user.id)
		.single();

	if (!project) {
		throw error(404, 'Project not found');
	}

	return { project };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = locals.user!;
		const form = await request.formData();

		const title = (form.get('title') as string)?.trim();
		const description = (form.get('description') as string)?.trim();
		const attachment = (form.get('attachment') as string)?.trim() || '';

		if (!title || !description) {
			return fail(400, { error: 'Title and description are required.' });
		}

		const { data: project } = await supabase
			.from('projects')
			.select('id')
			.eq('id', params.id)
			.eq('user_id', user.id)
			.single();

		if (!project) {
			return fail(403, { error: 'Project not found.' });
		}

		const { error: insertError } = await supabase.from('posts').insert({
			project_id: params.id,
			title,
			description,
			attachment
		});

		if (insertError) {
			return fail(500, { error: insertError.message });
		}

		redirect(303, `/dashboard/projects/${params.id}`);
	}
};
