import { env } from '$env/dynamic/private';

export interface SlackProject {
	id: string;
	title: string;
	description: string;
	repo_url?: string;	playable_url?: string;
	hours?: number;	user_name: string;
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
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: '*Please provide feedback on the following aspects:*'
					}
				},
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

export function buildApprovalModal(
	projectId: string,
	stage: 'first_round' | 'final',
	triggerId: string,
	channelId: string,
	messageTs: string,
	multiplier?: number,
	hours?: number
) {
	const blocks: any[] = [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: '*Please provide your feedback on this project:*'
			}
		}
	];

	// Add multiplier and hours inputs for final stage
	if (stage === 'final') {
		const multiplierValue = multiplier !== undefined && multiplier !== null ? Number(multiplier) : null;
		blocks.push({
			type: 'input',
			block_id: 'multiplier_block',
			element: {
				type: 'plain_text_input',
				action_id: 'multiplier_input',
				initial_value: multiplierValue !== null ? String(multiplierValue) : '1',
				placeholder: {
					type: 'plain_text',
					text: 'e.g. 1.5'
				}
			},
			label: {
				type: 'plain_text',
				text: 'Multiplier (can edit if needed)'
			}
		});
		const hoursValue = hours !== undefined && hours !== null ? Number(hours) : null;
		blocks.push({
			type: 'input',
			block_id: 'hours_block',
			element: {
				type: 'plain_text_input',
				action_id: 'hours_input',
				initial_value: hoursValue !== null ? String(hoursValue) : '0',
				placeholder: {
					type: 'plain_text',
					text: 'e.g. 5'
				}
			},
			label: {
				type: 'plain_text',
				text: 'Approved Hours (can override if needed)'
			}
		});
	}

	blocks.push({
		type: 'input',
		block_id: 'reviewer_notes_block',
		element: {
			type: 'plain_text_input',
			action_id: 'reviewer_notes_input',
			multiline: true,
			placeholder: {
				type: 'plain_text',
				text: 'Share your feedback and notes (optional)'
			}
		},
		label: {
			type: 'plain_text',
			text: 'Reviewer notes (optional)'
		},
		optional: true
	});

	return {
		trigger_id: triggerId,
		view: {
			type: 'modal',
			callback_id: 'project_approve_submission',
			private_metadata: JSON.stringify({
				projectId,
				stage,
				channelId,
				messageTs,
				multiplier: multiplier !== undefined && multiplier !== null ? Number(multiplier) : null
			}),
			title: {
				type: 'plain_text',
				text: 'Approve Project'
			},
			submit: {
				type: 'plain_text',
				text: 'Approve'
			},
			close: {
				type: 'plain_text',
				text: 'Cancel'
			},
			blocks
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
	const multiplierText =
		project.multiplier !== undefined && project.multiplier !== null
			? `\n*${isFinalStage ? 'Final Reviewer Hour Modifier' : 'Multiplier'}:* ${project.multiplier}x`
			: '';
	const hoursText =
		project.hours !== undefined && project.hours !== null ? `\n*Hours Logged:* ${project.hours}` : '';

	const blocks: any[] = [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `*Project Shipped: ${project.title}*\n*Challenge:* ${project.challenge_title}\n*User:* <@${project.user_slack_id}>${reviewerText}${multiplierText}${hoursText}`
			}
		},
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `*Description:*\n${project.description}\n*Repo URL:*\n${project.repo_url || 'N/A'}${project.playable_url ? `\n*Playable Link:*\n${project.playable_url}` : ''}`
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
				'Content-Type': 'application/json; charset=utf-8',
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
				'Content-Type': 'application/json; charset=utf-8',
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
