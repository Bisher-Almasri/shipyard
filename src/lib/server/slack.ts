import { SLACK_BOT_TOKEN } from '$env/static/private';

export interface SlackProject {
	id: string;
	title: string;
	description: string;
	repo_url?: string;
	user_name: string;
	user_slack_id: string;
	challenge_title: string;
	reviewer_slack_id?: string;
	multiplier?: number;
}

export function buildProjectReviewBlocks(project: SlackProject, isFinalStage: boolean = false) {
	const reviewerText = project.reviewer_slack_id ? `\n*Reviewed by:* <@${project.reviewer_slack_id}>` : '';
	const multiplierText = project.multiplier ? `\n*Multiplier:* ${project.multiplier}x` : '';

	const blocks: any[] = [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `*Project Shipped: ${project.title}*\n*Challenge:* ${project.challenge_title}\n*User:* <@${project.user_slack_id}>${reviewerText}${multiplierText}`
			}
		},
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `*Description:*\n${project.description}\n*Repo URL:*\n${project.repo_url || 'N/A'}`
			}
		}
	];

	if (!isFinalStage) {
		blocks.push({
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
						{ text: { type: 'plain_text', text: '3x' }, value: '3' }
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
		});
	} else {
		blocks.push({
			type: 'actions',
			elements: [
				{
					type: 'button',
					text: {
						type: 'plain_text',
						text: 'Approve Final ✅',
						emoji: true
					},
					style: 'primary',
					value: 'approve',
					action_id: `final_approve|${project.id}`
				},
				{
					type: 'button',
					text: {
						type: 'plain_text',
						text: 'Reject Final ❌',
						emoji: true
					},
					style: 'danger',
					value: 'reject',
					action_id: `final_reject|${project.id}`
				}
			]
		});
	}

	return blocks;
}

export async function sendSlackMessage(channel: string, text: string, blocks?: any[]) {
	if (!SLACK_BOT_TOKEN) return;

	try {
		const res = await fetch('https://slack.com/api/chat.postMessage', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${SLACK_BOT_TOKEN}`
			},
			body: JSON.stringify({
				channel,
				text,
				blocks
			})
		});

		const data = await res.json();
		if (!data.ok) {
			console.error('Slack API Error:', data.error);
		}
		return data;
	} catch (e) {
		console.error('Failed to send Slack message:', e);
	}
}

export async function updateSlackMessage(channel: string, ts: string, text: string, blocks?: any[]) {
	if (!SLACK_BOT_TOKEN) return;

	try {
		const res = await fetch('https://slack.com/api/chat.update', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${SLACK_BOT_TOKEN}`
			},
			body: JSON.stringify({
				channel,
				ts,
				text,
				blocks
			})
		});

		const data = await res.json();
		if (!data.ok) {
			console.error('Slack API Error (Update):', data.error);
		}
		return data;
	} catch (e) {
		console.error('Failed to update Slack message:', e);
	}
}
