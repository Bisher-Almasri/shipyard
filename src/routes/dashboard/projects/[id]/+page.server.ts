import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;

	const { data: project } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (!project) {
		throw error(404, 'Project not found');
	}

	const { data: posts } = await supabase
		.from('posts')
		.select(`
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
		`)
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

		const { data: project } = await supabase
			.from('projects')
			.select('*, users(hackclub_id, name)')
			.eq('id', projectId)
			.single();

		if (!project) return fail(404, { message: 'Project not found' });

		// Playable URL check
		const finalPlayableUrl = playable_url || project.playable_url;
		if (!finalPlayableUrl) {
			return fail(400, { message: 'Playable URL is mandatory to ship your project!' });
		}

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
			.select('id, attachment')
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
				playable_url: finalPlayableUrl
			})
			.eq('id', projectId);

		// Sync to Airtable
		const { syncProjectToAirtable } = await import('$lib/server/airtable');
		syncProjectToAirtable(projectId);

		// Fetch challenge details for Slack message
		const { data: challenge } = await supabase
			.from('jobs')
			.select('title')
			.eq('id', challengeId)
			.single();

		if (env.SLACK_BOT_TOKEN && env.SLACK_REVIEW_CHANNEL_ID) {
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
						blocks: [
							{
								type: 'section',
								text: {
									type: 'mrkdwn',
									text: `*Project Shipped: ${project.title}*\n*Challenge:* ${challenge?.title || 'Unknown'}\n*User:* <@${project.users?.hackclub_id}>`
								}
							},
							{
								type: 'section',
								text: {
									type: 'mrkdwn',
									text: `*Description:*\n${project.description}\n*Repo URL:*\n${project.repo_url || 'N/A'}`
								}
							},
							{
								type: 'actions',
								elements: [
									{
										type: 'static_select',
										placeholder: {
											type: 'plain_text',
											text: 'Assign Multiplier',
											emoji: true
										},
										options: [
											{ text: { type: 'plain_text', text: '1x' }, value: '1' },
											{ text: { type: 'plain_text', text: '2x' }, value: '2' },
											{ text: { type: 'plain_text', text: '3x' }, value: '3' },
										],
										action_id: `assign_multiplier|${project.id}`
									},
									{
										type: 'button',
										text: {
											type: 'plain_text',
											text: 'Reject',
											emoji: true
										},
										style: 'danger',
										value: 'reject',
										action_id: `reject_project|${project.id}`
									}
								]
							}
						]
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
