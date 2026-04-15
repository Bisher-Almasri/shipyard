import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { fail, redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;

	const { data: project } = await supabase
		.from('projects')
		.select('id, title, hackatime_projects')
		.eq('id', params.id)
		.eq('user_id', user.id)
		.single();

	if (!project) {
		throw error(404, 'Project not found');
	}

	// Fetch Hackatime connection
	const { data: connection } = await supabase
		.from('hackatime_connections')
		.select('access_token')
		.eq('user_id', user.id)
		.single();

	// Calculate suggested hours
	let suggestedHours = 0;
	if (connection && project.hackatime_projects?.length > 0) {
		try {
			const { getHackatimeProjects } = await import('$lib/server/hackatime');
			const allProjects = await getHackatimeProjects(connection.access_token);
			const linkedProjects = allProjects.filter((p) =>
				project.hackatime_projects.includes(p.name)
			);
			const totalHackatimeSeconds = linkedProjects.reduce((acc, p) => acc + p.total_seconds, 0);
			const totalHackatimeHours = totalHackatimeSeconds / 3600;

			// Fetch already logged hours
			const { data: loggedPosts } = await supabase
				.from('posts')
				.select('hours')
				.eq('project_id', params.id);

			const hoursLogged = (loggedPosts || []).reduce((acc, p) => acc + (Number(p.hours) || 0), 0);
			suggestedHours = Math.max(0, totalHackatimeHours - hoursLogged);
		} catch (e) {
			console.error('Failed to calculate suggested hours:', e);
		}
	}

	return {
		project,
		hasHackatime: !!connection,
		suggestedHours: parseFloat(suggestedHours.toFixed(1))
	};
};

import { uploadImage } from '$lib/server/cdn';

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const user = locals.user!;
		const form = await request.formData();

		const title = (form.get('title') as string)?.trim();
		const description = (form.get('description') as string)?.trim();
		let attachment = (form.get('attachment') as string)?.trim() || '';
		const imageFile = form.get('image') as File;

		if (!title || !description) {
			return fail(400, { error: 'Title and description are required.' });
		}

		// Re-fetch project and calculate hours automatically (no manual field)
		const { data: project } = await supabase
			.from('projects')
			.select('id, hackatime_projects, user_id')
			.eq('id', params.id)
			.eq('user_id', user.id)
			.single();

		if (!project) return fail(403, { error: 'Project not found.' });

		const { data: connection } = await supabase
			.from('hackatime_connections')
			.select('access_token')
			.eq('user_id', user.id)
			.single();

		if (!connection) {
			return fail(400, {
				error: 'No Hackatime connection found. Please connect Hackatime to log hours.'
			});
		}

		let hours = 0;
		if (project.hackatime_projects?.length > 0) {
			try {
				const { getHackatimeProjects } = await import('$lib/server/hackatime');
				const allProjects = await getHackatimeProjects(connection.access_token);
				const linkedProjects = allProjects.filter((p) =>
					project.hackatime_projects.includes(p.name)
				);
				const totalHackatimeSeconds = linkedProjects.reduce((acc, p) => acc + p.total_seconds, 0);
				const totalHackatimeHours = totalHackatimeSeconds / 3600;

				const { data: loggedPosts } = await supabase
					.from('posts')
					.select('hours')
					.eq('project_id', params.id);

				const hoursLoggedAlready = (loggedPosts || []).reduce(
					(acc, p) => acc + (Number(p.hours) || 0),
					0
				);
				hours = Math.max(0, totalHackatimeHours - hoursLoggedAlready);
			} catch (e) {
				console.error('Failed to calculate hours on submission:', e);
			}
		}

		if (hours <= 0.01) {
			return fail(400, {
				error: 'You have no new Hackatime hours to log for this project. Keep coding!'
			});
		}

		if (imageFile && imageFile.size > 0) {
			try {
				attachment = await uploadImage(imageFile);
			} catch (err: any) {
				return fail(400, { error: err.message || 'Image upload failed' });
			}
		}

		if (!attachment) {
			return fail(400, { error: 'An image or attachment is required for every dev log.' });
		}

		const { error: insertError } = await supabase.from('posts').insert({
			project_id: params.id,
			title,
			description,
			attachment,
			hours: parseFloat(hours.toFixed(1))
		});

		if (insertError) {
			return fail(500, { error: insertError.message });
		}

		redirect(303, `/dashboard/projects/${params.id}`);
	}
};
