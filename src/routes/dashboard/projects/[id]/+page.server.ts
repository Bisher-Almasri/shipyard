import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { buildProjectReviewBlocks } from '$lib/server/slack';
import { syncProjectToAirtable } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;

	const { data: project } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.eq('user_id', user.id)
		.single();

	if (!project) {
		throw error(404, 'Project not found or access denied');
	}

	const { data: posts } = await supabase
		.from('posts')
		.select(
			`
			*,
			project:projects (
				user:users (
					id,
					name,
					avatar
				)
			),
			comments (
				*,
				users (
					name,
					avatar
				)
			),
			post_likes (
				user_id
			)
		`
		)
		.eq('project_id', params.id)
		.order('created_at', { ascending: false });

	// Fetch all jobs
	const { data: jobs } = await supabase.from('jobs').select('*');

	// Fetch user's completed jobs
	const { data: completedJobs } = await supabase
		.from('user_jobs')
		.select('job_id')
		.eq('user_id', user.id);

	const completedJobIds = new Set((completedJobs || []).map((j) => j.job_id));
	const availableJobs = (jobs || []).filter((j) => !completedJobIds.has(j.id));

	return {
		project,
		user,
		posts: posts || [],
		availableJobs
	};
};

export const actions: Actions = {
	ship: async ({ locals, params, request }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const projectId = params.id;
		const formData = await request.formData();
		const challengeId = formData.get('challengeId') as string;
		const playable_url = (formData.get('playable_url') as string)?.trim();

		if (!challengeId) {
			return fail(400, { message: 'You must select a challenge to ship.' });
		}

		// Verify the selected job hasn't been completed by this user already
		const { data: existingCompletion } = await supabase
			.from('user_jobs')
			.select('job_id')
			.eq('user_id', user.id)
			.eq('job_id', challengeId)
			.single();

		if (existingCompletion) {
			return fail(400, { message: 'You have already completed this challenge. Choose a different one.' });
		}

		const { data: project } = await supabase
			.from('projects')
			.select('*, users(hackclub_id, name)')
			.eq('id', projectId)
			.eq('user_id', user.id)
			.single();

		if (!project) return fail(403, { message: 'Project not found or access denied' });

		// Playable URL check
		const finalPlayableUrl = playable_url || project.playable_url;
		if (!finalPlayableUrl) {
			return fail(400, { message: 'Playable URL is mandatory to ship your project!' });
		}

		// Note: user_id check already done in load() and project fetch above, but keep this guard for safety
		if (user.id !== project.user_id) return fail(403, { message: 'Unauthorized' });
		if (
			project.status === 'shipped' ||
			project.status === 'approved' ||
			project.status === 'rejected'
		) {
			return fail(400, { message: 'Project already shipped or reviewed' });
		}

		// Fetch dev logs for validation
		const { data: posts } = await supabase
			.from('posts')
			.select('id, attachment, hours')
			.eq('project_id', projectId);

		if (!posts || posts.length === 0) {
			return fail(400, { message: 'You must have at least 1 dev log to ship.' });
		}

		const missingImages = posts.some((p) => !p.attachment || p.attachment.trim() === '');
		if (missingImages) {
			return fail(400, { message: 'Every dev log must have an image or attachment to ship.' });
		}

		// Mark challenge as completed
		await supabase.from('user_jobs').insert({
			user_id: user.id,
			job_id: challengeId
		});

		// Update to shipped
		await supabase
			.from('projects')
			.update({
				status: 'shipped',
				playable_url: finalPlayableUrl,
				review_stage: 'first_round',
				selected_job_id: challengeId,
				last_reviewer_message: null,
				first_reviewer_slack_id: null,
				final_reviewer_slack_id: null,
				payout_awarded_at: null
			})
			.eq('id', projectId);

		// Sync to Airtable
		await syncProjectToAirtable(projectId);

		// Fetch challenge details for Slack message
		const { data: challenge } = await supabase
			.from('jobs')
			.select('title')
			.eq('id', challengeId)
			.single();

		const totalHours = (posts || []).reduce((acc, post) => acc + (Number(post.hours) || 0), 0);

		if (env.SLACK_BOT_TOKEN && env.SLACK_REVIEW_CHANNEL_ID) {
			const blocks = buildProjectReviewBlocks({
				id: project.id,
				title: project.title,
				description: project.description,
				repo_url: project.repo_url || undefined,
				playable_url: finalPlayableUrl || undefined,
				hours: totalHours,
				user_name: project.users?.name || 'Unknown',
				user_slack_id: project.users?.hackclub_id || '',
				challenge_title: challenge?.title || 'Unknown'
			});

			try {
				const res = await fetch('https://slack.com/api/chat.postMessage', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
					},
					body: JSON.stringify({
						channel: env.SLACK_REVIEW_CHANNEL_ID,
						text: `Project Shipped: ${project.title}\nChallenge: ${challenge?.title || 'Unknown'}\nUser: ${project.users?.name} (${project.users?.hackclub_id})\nURL: ${project.repo_url || ''}`,
						blocks
					})
				});

				const slackResponse = await res.json();
				if (!slackResponse.ok) {
					console.error('Slack API Error:', slackResponse.error);
				} else {
					console.log('Slack message sent successfully:', slackResponse);
				}
			} catch (e) {
				console.error('Failed to send Slack message due to fetch error:', e);
			}
		}

		return { success: true, shipped: true };
	},

	like: async ({ locals, request }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const formData = await request.formData();
		const postId = formData.get('postId') as string;

		// Check if already liked
		const { data: existingLike } = await supabase
			.from('post_likes')
			.select('*')
			.eq('post_id', postId)
			.eq('user_id', user.id)
			.single();

		if (existingLike) {
			// Unlike
			await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
			return { success: true, liked: false };
		} else {
			// Like
			await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
			return { success: true, liked: true };
		}
	},

	comment: async ({ locals, request }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const formData = await request.formData();
		const postId = formData.get('postId') as string;
		const content = formData.get('content') as string;

		if (!content || content.trim() === '') {
			return fail(400, { message: 'Comment content is required' });
		}

		const { data, error: err } = await supabase
			.from('comments')
			.insert({
				post_id: postId,
				user_id: user.id,
				content: content
			})
			.select('*, users(name, avatar)')
			.single();

		if (err) {
			return fail(500, { message: 'Failed to add comment' });
		}

		return { success: true, comment: data };
	},

	updateProject: async ({ locals, params, request }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const projectId = params.id;
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const repo_url = formData.get('repo_url') as string;
		const playable_url = formData.get('playable_url') as string;

		if (!title || !description) {
			return fail(400, { message: 'Title and description are required.' });
		}

		const { error: updateError } = await supabase
			.from('projects')
			.update({
				title,
				description,
				repo_url: repo_url || null,
				playable_url: playable_url || null
			})
			.eq('id', projectId)
			.eq('user_id', user.id);

		if (updateError) {
			return fail(500, { message: 'Failed to update project.' });
		}

		return { success: true };
	}
};
