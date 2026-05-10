import { env } from '$env/dynamic/private';

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

export function buildRejectionModal(
	projectId: string,
	stage: 'first_round' | 'final',
	triggerId: string,
	channelId: string,
	messageTs: string
) {
	return {
		trigger_id: triggerId,
		view: {
			type: 'modal',
			callback_id: 'project_reject_submission',
			private_metadata: JSON.stringify({
				projectId,
				stage,
				channelId,
				messageTs
			}),
			title: {
				type: 'plain_text',
				text: 'Reject Project'
			},
			submit: {
				type: 'plain_text',
				text: 'Reject'
			},
			close: {
				type: 'plain_text',
				text: 'Cancel'
			},
			blocks: [
				{
					type: 'input',
					block_id: 'reviewer_message_block',
					element: {
						type: 'plain_text_input',
						action_id: 'reviewer_message_input',
						multiline: true,
						placeholder: {
							type: 'plain_text',
							text: 'Explain why this project was rejected.'
						}
					},
					label: {
						type: 'plain_text',
						text: 'Reviewer message (required)'
					}
				}
			]
		}
	};
}

export function buildResolvedReviewBlocks(text: string) {
	return [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text
			}
		}
	];
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
			dispatch_action: true,
			type: 'input',
			element: {
				type: 'plain_text_input',
				action_id: `assign_multiplier|${project.id}`,
				dispatch_action_config: {
					trigger_actions_on: ['on_enter_pressed']
				},
				placeholder: {
					type: 'plain_text',
					text: 'e.g. 1.5'
				}
			},
			label: {
				type: 'plain_text',
				text: 'Approve with Multiplier (1 to 2.5, press Enter)'
			}
		});
		blocks.push({
			type: 'actions',
			elements: [
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
	if (!env.SLACK_BOT_TOKEN) return;

	try {
		const res = await fetch('https://slack.com/api/chat.postMessage', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
					Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
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
	if (!env.SLACK_BOT_TOKEN) return;

	try {
		const res = await fetch('https://slack.com/api/chat.update', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
					Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
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

export async function getSlackUsername(slackId: string): Promise<string | null> {
	if (!env.SLACK_BOT_TOKEN || !slackId) return null;

	try {
		const res = await fetch(`https://slack.com/api/users.info?user=${slackId}`, {
			headers: {
				Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
			}
		});

		const data = await res.json();
		if (!data.ok) {
			console.error('Slack API Error (users.info):', data.error);
			return null;
		}

		return data.user?.profile.display_name ||data.user?.name ||  "no slack name";
	} catch (e) {
		console.error('Failed to fetch Slack user info:', e);
		return null;
	}
}
