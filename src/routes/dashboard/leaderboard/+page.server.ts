import { supabase } from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [{ data: users, error: usersError }, { data: projects, error: projectsError }] =
		await Promise.all([
			supabase.from('users').select('id, name, avatar'),
			supabase
				.from('projects')
				.select('id, user_id, multiplier, posts(hours)')
				.eq('status', 'approved')
				.not('multiplier', 'is', null)
		]);

	if (usersError || projectsError) {
		return {
			users: []
		};
	}

	const weightedHoursByUser = new Map<string, number>();
	for (const project of projects || []) {
		const multiplier = Number(project.multiplier);
		if (!Number.isFinite(multiplier) || multiplier <= 0) continue;

		const projectHours = (project.posts || []).reduce(
			(acc: number, post: { hours: number | null }) => acc + (Number(post.hours) || 0),
			0
		);

		const weightedHours = projectHours * multiplier;
		weightedHoursByUser.set(
			project.user_id,
			(weightedHoursByUser.get(project.user_id) || 0) + weightedHours
		);
	}

	const leaderboard = (users || [])
		.map((user) => ({
			name: user.name,
			avatar: user.avatar,
			weighted_hours: weightedHoursByUser.get(user.id) || 0
		}))
		.sort((a, b) => b.weighted_hours - a.weighted_hours)
		.slice(0, 10);

	return {
		users: leaderboard
	};
};
