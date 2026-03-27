import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import { getHackatimeHours, getHackatimeStreak } from '$lib/server/hackatime';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;

	const { data: allJobs } = await supabase
		.from('jobs')
		.select('*')
		.order('created_at', { ascending: false });

	const { data: userJobs } = await supabase
		.from('user_jobs')
		.select('job_id, completed_at')
		.eq('user_id', user.id);

	const completedJobIds = new Set(userJobs?.map((j) => j.job_id) || []);

	const { count: itemsRedeemed } = await supabase
		.from('user_redemptions')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', user.id);

	const { data: hackatimeConnection } = await supabase
		.from('hackatime_connections')
		.select('access_token')
		.eq('user_id', user.id)
		.single();

	let hackatimeStats = null;

	if (hackatimeConnection) {
		try {
			const [hours, streak] = await Promise.all([
				getHackatimeHours(hackatimeConnection.access_token),
				getHackatimeStreak(hackatimeConnection.access_token)
			]);

			hackatimeStats = {
				hours: (hours.total_seconds / 3600).toFixed(1),
				streak: streak.streak_days
			};
		} catch (e) {
			console.error('Failed to fetch Hackatime stats:', e);
		}
	}

	return {
		jobs: allJobs || [],
		completedJobIds: Array.from(completedJobIds),
		stats: {
			jobsCompleted: completedJobIds.size,
			itemsRedeemed: itemsRedeemed || 0
		},
		hackatime: hackatimeStats,
		isHackatimeConnected: !!hackatimeConnection
	};
};
