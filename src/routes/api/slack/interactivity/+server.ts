import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	let payloadStr = '';
	try {
		const formData = await request.formData();
		payloadStr = formData.get('payload') as string;
	} catch (e) {
		try {
			const body = await request.json();
			payloadStr = body.payload ? body.payload : JSON.stringify(body);
		} catch (err) {
			return json({ error: 'Invalid payload' }, { status: 400 });
		}
	}

	if (!payloadStr) {
		return json({ error: 'No payload' }, { status: 400 });
	}

	let payload;
	try {
		payload = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
	} catch (e) {
		return json({ error: 'Invalid JSON payload' }, { status: 400 });
	}

	if (payload.type === 'block_actions' && payload.actions && payload.actions.length > 0) {
		const action = payload.actions[0];
		const actionIdParts = action.action_id.split('|');
		const actionType = actionIdParts[0];
		const targetId = actionIdParts[1];

		if (!targetId) {
			return json({ error: 'No target ID in action' }, { status: 400 });
		}

		const reviewerId = payload.user.id;

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

			await supabase
				.from('user_redemptions')
				.update({ status: newStatus })
				.eq('id', targetId);

			if (env.SLACK_BOT_TOKEN && redemption.users?.hackclub_id) {
				let dmText = '';
				if (newStatus === 'shipped') {
					dmText = `Hey! Good news, your shop item *${redemption.shop_items?.name}* has been shipped! 🚢`;
				} else if (newStatus === 'delivered') {
					dmText = `Hey! Your shop item *${redemption.shop_items?.name}* has been delivered! We hope you enjoy it! ✅`;
				}

				try {
					await fetch('https://slack.com/api/chat.postMessage', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
						},
						body: JSON.stringify({
							channel: redemption.users.hackclub_id,
							text: dmText
						})
					});
				} catch (e) {
					console.error('Failed to DM user on Slack:', e);
				}

				if (payload.message && payload.channel) {
					try {
						await fetch('https://slack.com/api/chat.update', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
							},
							body: JSON.stringify({
								channel: payload.channel.id,
								ts: payload.message.ts,
								text: replyText,
								blocks: [
									{
										type: 'section',
										text: {
											type: 'mrkdwn',
											text: replyText
										}
									}
								]
							})
						});
					} catch (e) {
						console.error('Failed to update Slack channel message:', e);
					}
				}
			}
		} else {
			const { data: project } = await supabase
				.from('projects')
				.select('*, users(hackclub_id)')
				.eq('id', targetId)
				.single();

			if (!project) {
				return json({ error: 'Project not found' }, { status: 404 });
			}

			let newStatus = 'pending';
			let multiplier = null;
			let replyText = '';

			if (actionType === 'assign_multiplier') {
				multiplier = parseFloat(action.selected_option.value);
				newStatus = 'approved';
				replyText = `Project <${project.repo_url || ''}|${project.title}> approved with a *${multiplier}x* multiplier by <@${reviewerId}>.`;
			} else if (actionType === 'reject_project') {
				newStatus = 'rejected';
				replyText = `Project <${project.repo_url || ''}|${project.title}> was *rejected* by <@${reviewerId}>.`;
			}

			await supabase
				.from('projects')
				.update({ status: newStatus, multiplier })
				.eq('id', targetId);

			// Send DM to user
			if (env.SLACK_BOT_TOKEN && project.users?.hackclub_id) {
				let dmText = '';
				if (newStatus === 'approved') {
					dmText = `Hey! Good news, your project *${project.title}* was reviewed and approved with a *${multiplier}x* multiplier! 🎉`;
				} else {
					dmText = `Hey there, unfortunately your project *${project.title}* was rejected. If you have any questions, feel free to reach out to the reviewer <@${reviewerId}>.`;
				}

				try {
					await fetch('https://slack.com/api/chat.postMessage', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
						},
						body: JSON.stringify({
							channel: project.users.hackclub_id,
							text: dmText
						})
					});
				} catch (e) {
					console.error('Failed to DM user on Slack:', e);
				}

				// Update the original message to reflect the review status and remove buttons
				if (payload.message && payload.channel) {
					try {
						await fetch('https://slack.com/api/chat.update', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
							},
							body: JSON.stringify({
								channel: payload.channel.id,
								ts: payload.message.ts,
								text: replyText,
								blocks: [
									{
										type: 'section',
										text: {
											type: 'mrkdwn',
											text: replyText
										}
									}
								]
							})
						});
					} catch (e) {
						console.error('Failed to update Slack channel message:', e);
					}
				}
			}
		}
	}

	return new Response(null, { status: 200 }); 
};
