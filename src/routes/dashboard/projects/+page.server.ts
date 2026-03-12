import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;

	const { data: projects } = await supabase
		.from('projects')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	const projectIds = (projects ?? []).map((p) => p.id);
	const { data: posts } = projectIds.length
		? await supabase.from('posts').select('id, project_id').in('project_id', projectIds)
		: { data: [] };

	return {
		projects: projects || [],
		posts: posts || []
	};
};

export const actions: Actions = {
	createProject: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();

		const title = (form.get('title') as string)?.trim();
		const description = (form.get('description') as string)?.trim();
		const header_img = (form.get('header_img') as string)?.trim() || null;

		if (!title || !description) {
			return fail(400, { error: 'Title and description are required.' });
		}

		const { error } = await supabase.from('projects').insert({
			title,
			description,
			header_img,
			user_id: user.id
		});

		if (error) {
			return fail(500, { error: error.message });
		}

		return { success: true };
	}
};
