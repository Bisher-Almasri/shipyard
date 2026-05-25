import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import {
	getHackatimeProjects,
	getHackatimeStreak
} from '$lib/server/hackatime';

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

	const { data: projects } = await supabase
		.from('projects')
		.select('hackatime_projects')
		.eq('user_id', user.id);

	const linkedHackatimeProjects = new Set(
		(projects || []).flatMap((project) => project.hackatime_projects || [])
	);

	const { data: hackatimeConnection } = await supabase
		.from('hackatime_connections')
		.select('access_token')
		.eq('user_id', user.id)
		.single();

	let hackatimeStats = null;

	if (hackatimeConnection) {
		try {
			const [projectsData, streak] = await Promise.all([
				linkedHackatimeProjects.size > 0
					? getHackatimeProjects(hackatimeConnection.access_token)
					: Promise.resolve([]),
				getHackatimeStreak(hackatimeConnection.access_token)
			]);

			const linkedSeconds =
				projectsData.reduce((total, project) => {
					return linkedHackatimeProjects.has(project.name)
						? total + (Number(project.total_seconds) || 0)
						: total;
				}, 0);

			hackatimeStats = {
				hours: (linkedSeconds / 3600).toFixed(1),
				streak: streak.streak_days
			};
		} catch (e: any) {
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
