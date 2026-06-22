import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import { env } from '$env/dynamic/private';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
	buildProjectReviewBlocks,
	buildRejectionModal,
	buildApprovalModal,
	buildResolvedReviewBlocks
} from '$lib/server/slack';

function verifySlackSignature(request: Request, rawBody: string): boolean {
	const signingSecret = env.SLACK_SIGNING_SECRET;
	if (!signingSecret) {
		const isProd = process.env.NODE_ENV === 'production';
		if (isProd) {
			console.error('[slack:interactivity] SLACK_SIGNING_SECRET is not set in production; rejecting request');
			return false;
		}
		console.warn('[slack:interactivity] SLACK_SIGNING_SECRET is not set; skipping signature check (non-production)');
		return true;
	}

	const signature = request.headers.get('x-slack-signature') || '';
	const timestamp = request.headers.get('x-slack-request-timestamp') || '';

	if (!signature || !timestamp) return false;

	const timestampNumber = Number(timestamp);
	if (!Number.isFinite(timestampNumber)) return false;

	const fiveMinutes = 60 * 5;
	if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > fiveMinutes) return false;

	const base = `v0:${timestamp}:${rawBody}`;
	const expected = `v0=${createHmac('sha256', signingSecret).update(base).digest('hex')}`;

	try {
		return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
	} catch {
		return false;
	}
}

async function postEphemeral(channelId: string, userId: string, text: string) {
	if (!env.SLACK_BOT_TOKEN || !channelId || !userId) return;

	try {
		await fetch('https://slack.com/api/chat.postEphemeral', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
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
				'Content-Type': 'application/json; charset=utf-8',
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
				'Content-Type': 'application/json; charset=utf-8',
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
		await syncProjectToAirtable(projectId);
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

function getApprovalModalNotes(payload: any): string {
	return (
		payload?.view?.state?.values?.reviewer_notes_block?.reviewer_notes_input?.value?.trim() || ''
	);
}

function getApprovalModalMultiplier(payload: any): number | null {
	const value = payload?.view?.state?.values?.multiplier_block?.multiplier_input?.value?.trim();
	if (!value) return null;
	const multiplier = parseFloat(value);
	return isNaN(multiplier) ? null : multiplier;
}

function getApprovalModalHours(payload: any): number | null {
	const value = payload?.view?.state?.values?.hours_block?.hours_input?.value?.trim();
	if (!value) return null;
	const hours = parseFloat(value);
	return isNaN(hours) ? null : hours;
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
	const contentType = request.headers.get('content-type') || 'unknown';
	console.log('[slack:interactivity] request received', {
		requestId,
		contentType
	});

	const rawBody = await request.text();
	if (!verifySlackSignature(request, rawBody)) {
		console.error('[slack:interactivity] invalid signature', { requestId });
		return json({ error: 'Invalid Slack signature' }, { status: 401 });
	}

	if (contentType.includes('application/x-www-form-urlencoded')) {
		const params = new URLSearchParams(rawBody);
		payloadStr = params.get('payload') || '';
	} else {
		try {
			const body = JSON.parse(rawBody || '{}');
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
			.single() as any;

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

		await (supabase.from('projects') as any).update(updateData).eq('id', projectId);
		await syncAirtable(projectId);

		const replyText = `Project *${project.title}* was *rejected* by <@${reviewerId}>.\n*Reviewer message:* ${reviewerMessage}`;
		await updateReviewMessage(channelId, messageTs, replyText);
		await dmUser(
			getHackclubId(project.users),
			`Your project *${project.title}* was rejected.\n\nReviewer message:\n${reviewerMessage}`
		);

		return json({ response_action: 'clear' });
	}

	if (payload.type === 'view_submission' && payload.view?.callback_id === 'project_approve_submission') {
		const reviewerNotes = getApprovalModalNotes(payload);
		const reviewerId = payload.user?.id;
		const metadata = JSON.parse(payload.view.private_metadata || '{}');
		const projectId = metadata.projectId as string;
		const stage = metadata.stage as 'first_round' | 'final';
		const channelId = metadata.channelId as string;
		const messageTs = metadata.messageTs as string;
		const multiplier = metadata.multiplier as number;

		if (!projectId || !reviewerId || !stage) {
			return json({
				response_action: 'errors',
				errors: {
					reviewer_notes_block: 'Missing required review metadata. Please try again.'
				}
			});
		}

		const { data: project } = await supabase
			.from('projects')
			.select('id, title, status, review_stage, repo_url, selected_job_id, multiplier, description, playable_url, users(hackclub_id, name), posts(hours)')
			.eq('id', projectId)
			.single() as any;

		if (!project) {
			return json({
				response_action: 'errors',
				errors: {
					reviewer_notes_block: 'Project not found. Please refresh and try again.'
				}
			});
		}

		if (project.review_stage !== stage || project.status !== 'shipped') {
			return json({
				response_action: 'errors',
				errors: {
					reviewer_notes_block: 'This review action is stale and can no longer be applied.'
				}
			});
		}

		if (stage === 'first_round') {
			// First round approval - advance to final review
			await (supabase.from('projects') as any).update({
				multiplier,
				review_stage: 'final',
				first_reviewer_slack_id: reviewerId,
				last_reviewer_message: reviewerNotes || null
			})
				.eq('id', projectId);

			await syncAirtable(projectId);

			let challengeTitle = 'Unknown';
			if (project.selected_job_id) {
				const { data: challenge } = await supabase
					.from('jobs')
					.select('title')
					.eq('id', project.selected_job_id)
					.single() as any;
				challengeTitle = challenge?.title || 'Unknown';
			}

			const totalHours = (project.posts || []).reduce((acc: number, p: any) => acc + (Number(p.hours) || 0), 0);

			await fetch('https://slack.com/api/chat.postMessage', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
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
							playable_url: project.playable_url || undefined,
							user_name: project.users?.name || 'Unknown',
							user_slack_id: project.users?.hackclub_id || '',
							challenge_title: challengeTitle,
							reviewer_slack_id: reviewerId,
							multiplier,
							hours: totalHours
						},
						true
					)
				})
			});

			const replyText = `Project <${project.repo_url || ''}|${project.title}> passed first review with *${multiplier}x* by <@${reviewerId}>.\n*Reviewer notes:* ${reviewerNotes || 'None'}`;
			await updateReviewMessage(channelId, messageTs, replyText);
			await dmUser(
				getHackclubId(project.users),
				`Your project *${project.title}* passed first-round review with *${multiplier}x* and is now in final review.\n\n*Reviewer notes:* ${reviewerNotes || 'None'}`
			);
		} else {
			// Final round approval
			const editedMultiplier = getApprovalModalMultiplier(payload);
			const newMultiplier = editedMultiplier !== null ? editedMultiplier : project.multiplier;
			
			const editedHours = getApprovalModalHours(payload);
			const pMultiplier = Number(project.multiplier) || 1;

			console.log('[final_approve] DEBUG:', {
				editedMultiplier,
				newMultiplier,
				editedHours,
				pMultiplier,
				projectMultiplier: project.multiplier,
				channelId,
				messageTs,
				stage,
				reviewerId
			});

			// Validate multiplier if edited
			if (editedMultiplier !== null) {
				if (isNaN(editedMultiplier) || editedMultiplier < 1 || editedMultiplier > 2.5) {
					return json({
						response_action: 'errors',
						errors: {
							multiplier_block: 'Multiplier must be between 1 and 2.5.'
						}
					});
				}
			}

			// Validate hours if edited
			if (editedHours !== null) {
				if (isNaN(editedHours) || editedHours < 0) {
					return json({
						response_action: 'errors',
						errors: {
							hours_block: 'Hours must be a positive number.'
						}
					});
				}
			}

			const { data: posts } = await supabase
				.from('posts')
				.select('hours')
				.eq('project_id', project.id) as any;
			const totalHours = (posts || []).reduce((acc: number, p: any) => acc + (Number(p.hours) || 0), 0);
			const approvedHours = editedHours !== null ? editedHours : totalHours;
			const payoutHours = Math.min(approvedHours, 10);

			let jobPoints = 0;
			if (project.selected_job_id) {
				const { data: job } = await supabase
					.from('jobs')
					.select('points')
					.eq('id', project.selected_job_id)
					.single() as any;
				jobPoints = Number(job?.points) || 0;
			}

			const finalMultiplier = Number(newMultiplier) || 1;
			const payout = Math.round((payoutHours * 5 * finalMultiplier + jobPoints) / 2);
			const awardedAt = new Date().toISOString();

			const { data: payoutGuardProject } = await (supabase.from('projects') as any)
				.update({
					status: 'approved',
					final_reviewer_slack_id: reviewerId,
					last_reviewer_message: reviewerNotes || null,
					multiplier: finalMultiplier,
					payout_awarded_at: awardedAt
				})
				.eq('id', projectId)
				.is('payout_awarded_at', null)
				.select('id, user_id, title, users(hackclub_id)')
				.single() as any;

			if (!payoutGuardProject) {
				await postEphemeral(channelId, reviewerId, 'Payout was already awarded for this project.');
				return new Response(null, { status: 200 });
			}

			const { data: userRow } = await supabase
				.from('users')
				.select('cargo_points')
				.eq('id', payoutGuardProject.user_id)
				.single() as any;

			const nextBalance = (Number(userRow?.cargo_points) || 0) + payout;
			const { error: userUpdateError } = await (supabase.from('users') as any)
				.update({ cargo_points: nextBalance })
				.eq('id', payoutGuardProject.user_id);

			if (userUpdateError) {
				await (supabase.from('projects') as any)
					.update({ payout_awarded_at: null, status: 'shipped' })
					.eq('id', projectId)
					.eq('payout_awarded_at', awardedAt);
				await postEphemeral(channelId, reviewerId, 'Could not award payout. Please retry.');
				return new Response(null, { status: 200 });
			}

			await syncAirtable(projectId);

			const multiplierNote = editedMultiplier !== null && editedMultiplier !== pMultiplier 
				? ` (edited from ${pMultiplier}x to ${finalMultiplier}x)` 
				: '';
			const hoursNote = editedHours !== null && editedHours !== totalHours
				? ` (edited from ${totalHours.toFixed(1)} to ${editedHours.toFixed(1)})`
				: '';
				
			const breakdown = `Hours: (${approvedHours.toFixed(1)} approved, capped to ${payoutHours.toFixed(1)} x 5 x ${finalMultiplier}) + Job: ${jobPoints} = ${payout}`;
			const replyText = `Project <${project.repo_url || ''}|${project.title}> was *final approved* by <@${reviewerId}>.\n*Final Reviewer Hour Modifier:* ${finalMultiplier}x${multiplierNote}\n*Approved Hours:* ${approvedHours}${hoursNote}\n*Payout:* ${breakdown}${reviewerNotes ? `\n*Reviewer notes:* ${reviewerNotes}` : ''}`;
			
			console.log('[final_approve] MESSAGE DEBUG:', {
				replyText,
				multiplierNote,
				hoursNote,
				approvedHours,
				totalHours,
				finalMultiplier,
				payout,
				channelId,
				messageTs
			});
			
			await updateReviewMessage(channelId, messageTs, replyText);

			const dmHoursMsg = editedHours !== null && editedHours !== totalHours
				? `\n\n*Note:* Unfortunately, only ${editedHours} hours were approved for this project.`
				: '';

			await dmUser(
				getHackclubId(payoutGuardProject.users),
				`Your project *${project.title}* was final-approved.\n*Final Reviewer Hour Modifier:* ${finalMultiplier}x${multiplierNote}\n*Approved Hours:* ${approvedHours}${hoursNote}\nPayout credited: *${payout}* cargo points.\n(${breakdown})${reviewerNotes ? `\n\n*Reviewer notes:* ${reviewerNotes}` : ''}${dmHoursMsg}`
			);
		}

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
				.single() as any;

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

			await (supabase.from('user_redemptions') as any).update({ status: newStatus }).eq('id', targetId);

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
			.single() as any;

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

			if (!env.SLACK_BOT_TOKEN || !payload.trigger_id) {
				await postEphemeral(channelId, reviewerId, 'Cannot open approval form. Missing Slack metadata.');
				return new Response(null, { status: 200 });
			}

			await fetch('https://slack.com/api/views.open', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
					Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
				},
				body: JSON.stringify(
					buildApprovalModal(targetId, 'first_round', payload.trigger_id, channelId, messageTs, multiplier)
				)
			});

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
					'Content-Type': 'application/json; charset=utf-8',
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

			if (!env.SLACK_BOT_TOKEN || !payload.trigger_id) {
				await postEphemeral(channelId, reviewerId, 'Cannot open approval form. Missing Slack metadata.');
				return new Response(null, { status: 200 });
			}

			const { data: posts } = await supabase
				.from('posts')
				.select('hours')
				.eq('project_id', project.id) as any;
			const totalHours = (posts || []).reduce((acc: number, p: any) => acc + (Number(p.hours) || 0), 0);

			await fetch('https://slack.com/api/views.open', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
					Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
				},
				body: JSON.stringify(
					buildApprovalModal(targetId, 'final', payload.trigger_id, channelId, messageTs, project.multiplier, totalHours)
				)
			});

			return new Response(null, { status: 200 });
		}
	}

	return new Response(null, { status: 200 });
};
