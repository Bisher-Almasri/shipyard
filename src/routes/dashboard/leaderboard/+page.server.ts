import { supabase } from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [{ data: users, error: usersError }, { data: projects, error: projectsError }] =
		await Promise.all([
			supabase.from('users').select('id, name, slack_name, avatar, hackclub_id'),
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

	const rawLeaderboard = (users || [])
		.map((user) => ({
			id: user.id,
			name: user.name,
			slack_name: user.slack_name,
			hackclub_id: user.hackclub_id,
			avatar: user.avatar,
			weighted_hours: weightedHoursByUser.get(user.id) || 0
		}))
		.sort((a, b) => b.weighted_hours - a.weighted_hours)
		.slice(0, 10);

	// Fetch missing slack_names for top 10
	const { getSlackUsername } = await import('$lib/server/slack');
	const leaderboard = await Promise.all(
		rawLeaderboard.map(async (user) => {
			if (!user.slack_name && user.hackclub_id) {
				const fetchedName = await getSlackUsername(user.hackclub_id);
				if (fetchedName) {
					// Update DB in background (don't await for faster response if you want, 
					// but here we might as well ensure the user sees it)
					await supabase
						.from('users')
						.update({ slack_name: fetchedName })
						.eq('id', user.id);
					return {
						name: fetchedName,
						avatar: user.avatar,
						weighted_hours: user.weighted_hours
					};
				}
			}
			return {
				name: user.slack_name || "no slack name",
				avatar: user.avatar,
				weighted_hours: user.weighted_hours
			};
		})
	);

	return {
		users: leaderboard
	};
};
