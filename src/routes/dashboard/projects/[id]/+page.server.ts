import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;

	const { data: project } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.eq('user_id', user.id)
		.single();

	if (!project) {
		throw error(404, 'Project not found');
	}

	const { data: posts } = await supabase
		.from('posts')
		.select('*')
		.eq('project_id', params.id)
		.order('created_at', { ascending: false });

	return {
		project,
		posts: posts || []
	};
};
