import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import { env } from '$env/dynamic/private';
import {
	buildProjectReviewBlocks,
	buildRejectionModal,
	buildResolvedReviewBlocks
} from '$lib/server/slack';

async function postEphemeral(channelId: string, userId: string, text: string) {
	if (!env.SLACK_BOT_TOKEN || !channelId || !userId) return;

	try {
		await fetch('https://slack.com/api/chat.postEphemeral', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
			},
			body: JSON.stringify({
				channel: channelId,
				user: userId,
				text
			})
		});
	} catch (e) {
		console.error('Failed to send ephemeral message:', e);
	}
}

async function updateReviewMessage(channelId: string, ts: string, text: string) {
	if (!env.SLACK_BOT_TOKEN || !channelId || !ts) return;

	try {
		await fetch('https://slack.com/api/chat.update', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
			},
			body: JSON.stringify({
				channel: channelId,
				ts,
				text,
				blocks: buildResolvedReviewBlocks(text)
			})
		});
	} catch (e) {
		console.error('Failed to update Slack channel message:', e);
	}
}

async function dmUser(slackId: string, text: string) {
	if (!env.SLACK_BOT_TOKEN || !slackId) return;

	try {
		await fetch('https://slack.com/api/chat.postMessage', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
			},
			body: JSON.stringify({
				channel: slackId,
				text
			})
		});
	} catch (e) {
		console.error('Failed to DM user on Slack:', e);
	}
}

async function syncAirtable(projectId: string) {
	try {
		const { syncProjectToAirtable } = await import('$lib/server/airtable');
		syncProjectToAirtable(projectId);
	} catch (e) {
		console.error('Failed to sync project to Airtable:', e);
	}
}

function extractPayloadAction(payload: any) {
	if (!payload?.actions?.length) return null;
	const action = payload.actions[0];
	const actionIdParts = action.action_id?.split('|') || [];

	return {
		action,
		actionType: actionIdParts[0],
		targetId: actionIdParts[1]
	};
}

function getRejectedModalMessage(payload: any): string {
	return (
		payload?.view?.state?.values?.reviewer_message_block?.reviewer_message_input?.value?.trim() || ''
	);
}

function getHackclubId(userRelation: any): string {
	if (Array.isArray(userRelation)) {
		return userRelation[0]?.hackclub_id || '';
	}

	return userRelation?.hackclub_id || '';
}

export const POST: RequestHandler = async ({ request }) => {
	let payloadStr = '';
	const requestId = crypto.randomUUID();
	console.log('[slack:interactivity] request received', {
		requestId,
		contentType: request.headers.get('content-type') || 'unknown'
	});
	try {
		const formData = await request.formData();
		payloadStr = formData.get('payload') as string;
	} catch {
		try {
			const body = await request.json();
			payloadStr = body.payload ? body.payload : JSON.stringify(body);
		} catch {
			return json({ error: 'Invalid payload' }, { status: 400 });
		}
	}

	if (!payloadStr) {
		return json({ error: 'No payload' }, { status: 400 });
	}

	let payload: any;
	try {
		payload = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
	} catch {
		return json({ error: 'Invalid JSON payload' }, { status: 400 });
	}

	console.log('[slack:interactivity] parsed payload', {
		requestId,
		type: payload?.type || 'unknown',
		callbackId: payload?.view?.callback_id || null,
		actionId: payload?.actions?.[0]?.action_id || null,
		userId: payload?.user?.id || null,
		channelId: payload?.channel?.id || null
	});

	if (payload.type === 'view_submission' && payload.view?.callback_id === 'project_reject_submission') {
		const reviewerMessage = getRejectedModalMessage(payload);
		if (!reviewerMessage) {
			return json({
				response_action: 'errors',
				errors: {
					reviewer_message_block: 'Reviewer message is required.'
				}
			});
		}

		const reviewerId = payload.user?.id;
		const metadata = JSON.parse(payload.view.private_metadata || '{}');
		const projectId = metadata.projectId as string;
		const stage = metadata.stage as 'first_round' | 'final';
		const channelId = metadata.channelId as string;
		const messageTs = metadata.messageTs as string;

		if (!projectId || !reviewerId || !stage) {
			return json({
				response_action: 'errors',
				errors: {
					reviewer_message_block: 'Missing required review metadata. Please try again.'
				}
			});
		}

		const { data: project } = await supabase
			.from('projects')
			.select('id, title, status, review_stage, users(hackclub_id)')
			.eq('id', projectId)
			.single();

		if (!project) {
			return json({
				response_action: 'errors',
				errors: {
					reviewer_message_block: 'Project not found. Please refresh and try again.'
				}
			});
		}

		if (project.review_stage !== stage || project.status === 'approved' || project.status === 'rejected') {
			return json({
				response_action: 'errors',
				errors: {
					reviewer_message_block: 'This review action is stale and can no longer be applied.'
				}
			});
		}

		const updateData: Record<string, string> = {
			status: 'rejected',
			last_reviewer_message: reviewerMessage
		};
		if (stage === 'first_round') {
			updateData.first_reviewer_slack_id = reviewerId;
		} else {
			updateData.final_reviewer_slack_id = reviewerId;
		}

		await supabase.from('projects').update(updateData).eq('id', projectId);
		await syncAirtable(projectId);

		const replyText = `Project *${project.title}* was *rejected* by <@${reviewerId}>.\n*Reviewer message:* ${reviewerMessage}`;
		await updateReviewMessage(channelId, messageTs, replyText);
		await dmUser(
			getHackclubId(project.users),
			`Your project *${project.title}* was rejected.\n\nReviewer message:\n${reviewerMessage}`
		);

		return json({ response_action: 'clear' });
	}

	if (payload.type === 'block_actions') {
		const parsed = extractPayloadAction(payload);
		if (!parsed) return new Response(null, { status: 200 });

		const { action, actionType, targetId } = parsed;
		if (!targetId) {
			return json({ error: 'No target ID in action' }, { status: 400 });
		}

		const reviewerId = payload.user?.id;
		const channelId = payload.channel?.id;
		const messageTs = payload.message?.ts;

		if (actionType.startsWith('shop_')) {
			const { data: redemption } = await supabase
				.from('user_redemptions')
				.select('*, users(hackclub_id), shop_items(name)')
				.eq('id', targetId)
				.single();

			if (!redemption) {
				return json({ error: 'Redemption not found' }, { status: 404 });
			}

			let newStatus = 'pending';
			let replyText = '';

			if (actionType === 'shop_shipped') {
				newStatus = 'shipped';
				replyText = `Shop item *${redemption.shop_items?.name}* for <@${redemption.users?.hackclub_id || redemption.user_id}> was marked as *shipped* by <@${reviewerId}> 🚢.`;
			} else if (actionType === 'shop_delivered') {
				newStatus = 'delivered';
				replyText = `Shop item *${redemption.shop_items?.name}* for <@${redemption.users?.hackclub_id || redemption.user_id}> was marked as *delivered* by <@${reviewerId}> ✅.`;
			}

			await supabase.from('user_redemptions').update({ status: newStatus }).eq('id', targetId);

			if (newStatus === 'shipped') {
				await dmUser(
					redemption.users?.hackclub_id,
					`Hey! Good news, your shop item *${redemption.shop_items?.name}* has been shipped! 🚢`
				);
			} else if (newStatus === 'delivered') {
				await dmUser(
					redemption.users?.hackclub_id,
					`Hey! Your shop item *${redemption.shop_items?.name}* has been delivered! We hope you enjoy it! ✅`
				);
			}

			await updateReviewMessage(channelId, messageTs, replyText);
			return new Response(null, { status: 200 });
		}

		const { data: project } = await supabase
			.from('projects')
			.select('*, users(hackclub_id)')
			.eq('id', targetId)
			.single();

		if (!project) {
			return json({ error: 'Project not found' }, { status: 404 });
		}

		if (actionType === 'assign_multiplier') {
			if (project.review_stage !== 'first_round' || project.status !== 'shipped') {
				await postEphemeral(channelId, reviewerId, 'This first-round review action is no longer valid.');
				return new Response(null, { status: 200 });
			}

			if (!env.SLACK_FINAL_REVIEW_CHANNEL_ID) {
				await postEphemeral(
					channelId,
					reviewerId,
					'Final review channel is not configured. Cannot advance this project yet.'
				);
				return new Response(null, { status: 200 });
			}

			const multiplier = parseFloat(action.value);
			if (isNaN(multiplier) || multiplier < 1 || multiplier > 2.5) {
				await postEphemeral(
					channelId,
					reviewerId,
					`Invalid multiplier: *${action.value}*. Please enter a number between 1 and 2.5.`
				);
				return new Response(null, { status: 200 });
			}

			await supabase
				.from('projects')
				.update({
					multiplier,
					review_stage: 'final',
					first_reviewer_slack_id: reviewerId,
					last_reviewer_message: null
				})
				.eq('id', targetId);

			let challengeTitle = 'Unknown';
			if (project.selected_job_id) {
				const { data: challenge } = await supabase
					.from('jobs')
					.select('title')
					.eq('id', project.selected_job_id)
					.single();
				challengeTitle = challenge?.title || 'Unknown';
			}

			await fetch('https://slack.com/api/chat.postMessage', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
				},
				body: JSON.stringify({
					channel: env.SLACK_FINAL_REVIEW_CHANNEL_ID,
					text: `Project awaiting final review: ${project.title}`,
					blocks: buildProjectReviewBlocks(
						{
							id: project.id,
							title: project.title,
							description: project.description,
							repo_url: project.repo_url || undefined,
							user_name: project.users?.name || 'Unknown',
							user_slack_id: project.users?.hackclub_id || '',
							challenge_title: challengeTitle,
							reviewer_slack_id: reviewerId,
							multiplier
						},
						true
					)
				})
			});

			const replyText = `Project <${project.repo_url || ''}|${project.title}> passed first review with *${multiplier}x* by <@${reviewerId}> and was sent to final review.`;
			await updateReviewMessage(channelId, messageTs, replyText);
			await dmUser(
				project.users?.hackclub_id,
				`Your project *${project.title}* passed first-round review with *${multiplier}x* and is now in final review.`
			);
			return new Response(null, { status: 200 });
		}

		if (actionType === 'reject_project' || actionType === 'final_reject') {
			const stage = actionType === 'reject_project' ? 'first_round' : 'final';
			if (project.review_stage !== stage || project.status !== 'shipped') {
				await postEphemeral(channelId, reviewerId, 'This rejection action is no longer valid.');
				return new Response(null, { status: 200 });
			}

			if (!env.SLACK_BOT_TOKEN || !payload.trigger_id) {
				await postEphemeral(channelId, reviewerId, 'Cannot open rejection form. Missing Slack metadata.');
				return new Response(null, { status: 200 });
			}

			await fetch('https://slack.com/api/views.open', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
				},
				body: JSON.stringify(
					buildRejectionModal(targetId, stage, payload.trigger_id, channelId, messageTs)
				)
			});

			return new Response(null, { status: 200 });
		}

		if (actionType === 'final_approve') {
			if (project.review_stage !== 'final' || project.status !== 'shipped') {
				await postEphemeral(channelId, reviewerId, 'This final review action is no longer valid.');
				return new Response(null, { status: 200 });
			}

			if (!project.multiplier || Number(project.multiplier) < 1) {
				await postEphemeral(channelId, reviewerId, 'Cannot finalize payout without a valid multiplier.');
				return new Response(null, { status: 200 });
			}

			const { data: posts } = await supabase
				.from('posts')
				.select('hours')
				.eq('project_id', project.id);
			const totalHours = (posts || []).reduce((acc, p) => acc + (Number(p.hours) || 0), 0);

			let jobPoints = 0;
			if (project.selected_job_id) {
				const { data: job } = await supabase
					.from('jobs')
					.select('points')
					.eq('id', project.selected_job_id)
					.single();
				jobPoints = Number(job?.points) || 0;
			}

			const multiplier = Number(project.multiplier);
			const payout = Math.round((totalHours * multiplier + jobPoints) / 2);
			const awardedAt = new Date().toISOString();

			const { data: payoutGuardProject } = await supabase
				.from('projects')
				.update({
					status: 'approved',
					final_reviewer_slack_id: reviewerId,
					last_reviewer_message: null,
					payout_awarded_at: awardedAt
				})
				.eq('id', targetId)
				.is('payout_awarded_at', null)
				.select('id, user_id, title, users(hackclub_id)')
				.single();

			if (!payoutGuardProject) {
				await postEphemeral(channelId, reviewerId, 'Payout was already awarded for this project.');
				return new Response(null, { status: 200 });
			}

			const { data: userRow } = await supabase
				.from('users')
				.select('cargo_points')
				.eq('id', payoutGuardProject.user_id)
				.single();

			const nextBalance = (Number(userRow?.cargo_points) || 0) + payout;
			const { error: userUpdateError } = await supabase
				.from('users')
				.update({ cargo_points: nextBalance })
				.eq('id', payoutGuardProject.user_id);

			if (userUpdateError) {
				await supabase
					.from('projects')
					.update({ payout_awarded_at: null, status: 'shipped' })
					.eq('id', targetId)
					.eq('payout_awarded_at', awardedAt);
				await postEphemeral(channelId, reviewerId, 'Could not award payout. Please retry.');
				return new Response(null, { status: 200 });
			}

			await syncAirtable(targetId);

			const breakdown = `Hours: (${totalHours.toFixed(1)} x ${multiplier} + Job: ${jobPoints}) / 2 (beta) = ${payout}`;
			const replyText = `Project <${project.repo_url || ''}|${project.title}> was *final approved* by <@${reviewerId}>.\n*Payout:* ${breakdown}`;
			await updateReviewMessage(channelId, messageTs, replyText);
			await dmUser(
				getHackclubId(payoutGuardProject.users),
				`Your project *${project.title}* was final-approved.\nPayout credited: *${payout}* cargo points.\n(${breakdown})`
			);

			return new Response(null, { status: 200 });
		}
	}

	return new Response(null, { status: 200 });
};
