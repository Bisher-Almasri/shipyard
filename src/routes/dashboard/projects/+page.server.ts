import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { fail } from '@sveltejs/kit';
import { getHackatimeProjects, type HackatimeProject } from '$lib/server/hackatime';
import { env } from '$env/dynamic/private';

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

	const { data: connection } = await supabase
		.from('hackatime_connections')
		.select('access_token')
		.eq('user_id', user.id)
		.single();

	let hackatimeProjects: HackatimeProject[] = [];
	if (connection) {
		try {
			const allProjects = await getHackatimeProjects(connection.access_token);
			const cutoffDate = new Date('2026-03-20T00:00:00Z');

			hackatimeProjects = allProjects
				.filter((hp) => {
					if (!hp.most_recent_heartbeat) return false;
					return new Date(hp.most_recent_heartbeat) >= cutoffDate;
				})
				.sort(
					(a, b) =>
						new Date(b.most_recent_heartbeat).getTime() -
						new Date(a.most_recent_heartbeat).getTime()
				);
		} catch (e: any) {
			console.error('Failed to fetch hackatime projects:', e);
			if (e.message?.includes('Unauthorized') || e.message?.includes('401')) {
				await supabase
					.from('hackatime_connections')
					.delete()
					.eq('user_id', user.id);
			}
		}
	}

	return {
		projects: projects || [],
		posts: posts || [],
		hackatimeProjects
	};
};

import { syncProjectToAirtable } from '$lib/server/airtable';
import { uploadImage } from '$lib/server/cdn';

export const actions: Actions = {
	createProject: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();

		const title = (form.get('title') as string)?.trim();
		const description = (form.get('description') as string)?.trim();
		const repo_url = (form.get('repo_url') as string)?.trim() || null;
		const playable_url = (form.get('playable_url') as string)?.trim() || null;
		let header_img = (form.get('header_img') as string)?.trim() || null;
		const imageFile = form.get('image') as File;
		const selectedHackatime = form.getAll('hackatime_projects') as string[];

		if (!title || !description) {
			return fail(400, { error: 'Title and description are required.' });
		}

		if (selectedHackatime.length === 0) {
			return fail(400, { error: 'You must link at least one Hackatime project.' });
		}

		// Check if any selected Hackatime projects are already linked to other projects by this user
		const { data: existingProjects } = await supabase
			.from('projects')
			.select('id, hackatime_projects')
			.eq('user_id', user.id);

		const existingHackatimeProjects = new Set<string>();
		(existingProjects || []).forEach((p) => {
			(p.hackatime_projects || []).forEach((hp: string) => {
				existingHackatimeProjects.add(hp);
			});
		});

		const reusingProjects = selectedHackatime.filter((hp) => existingHackatimeProjects.has(hp));
		if (reusingProjects.length > 0) {
			return fail(400, {
				error: `You've already linked these Hackatime projects to other shipyard projects: ${reusingProjects.join(', ')}. Each Hackatime project can only be linked once.`
			});
		}

		if (imageFile && imageFile.size > 0) {
			try {
				header_img = await uploadImage(imageFile);
			} catch (err: any) {
				return fail(400, { error: err.message || 'Image upload failed' });
			}
		}

		const { data: newProject, error } = await supabase
			.from('projects')
			.insert({
				title,
				description,
				repo_url,
				playable_url,
				header_img,
				user_id: user.id,
				hackatime_projects: selectedHackatime
			})
			.select()
			.single();

		if (error || !newProject) {
			return fail(500, { error: error?.message || 'Failed to create project' });
		}

		// Sync to Airtable
		// syncProjectToAirtable(newProject.id);

		return { success: true };
	}
};
