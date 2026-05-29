import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { env as privateEnv } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

type ShopItem = {
	id: string;
	name: string;
	description: string | null;
	image_url: string | null;
	cost: number;
};

type UserRedemption = {
	id: string;
	redeemed_at: string;
	status: string;
	shop_items: ShopItem | null;
};

export const load: PageServerLoad = async ({ locals }) => {
	const { data: shopItems } = await supabase
		.from('shop_items')
		.select('*')
		.order('cost', { ascending: true });

	const typedShopItems: ShopItem[] = shopItems || [];
	let userRedemptions: UserRedemption[] = [];
	if (locals.user) {
		const { data } = await supabase
			.from('user_redemptions')
			.select('*, shop_items(*)')
			.eq('user_id', locals.user.id)
			.order('redeemed_at', { ascending: false });
		userRedemptions = (data || []) as UserRedemption[];
	}

	return {
		shopItems: typedShopItems,
		userRedemptions
	};
};

export const actions: Actions = {
	redeem: async ({ request, locals }) => {
		console.log('Redeem action received');
		const user = locals.user;
		if (!user) {
			console.log('Redeem failed: No user in locals');
			return fail(401, { error: 'Unauthorized' });
		}

		console.log(
			'User from locals:',
			JSON.stringify({ id: user.id, hackclub_id: user.hackclub_id, name: user.name })
		);

		const formData = await request.formData();
		console.log('FormData received');
		const itemId = formData.get('item_id') as string;
		console.log('Item ID:', itemId);

		if (!itemId) {
			console.log('Error: Item ID is missing');
			return fail(400, { error: 'Item ID is required' });
		}

		console.log('Fetching item from Supabase...');
		const { data: item, error: itemError } = await supabase
			.from('shop_items')
			.select('*')
			.eq('id', itemId)
			.single();
		if (itemError) console.error('Item Fetch Error:', itemError);
		if (!item) {
			console.log('Error: Item not found');
			return fail(404, { error: 'Item not found' });
		}
		console.log('Item found:', item.name);

		console.log('Fetching user data from Supabase...');
		const { data: userData, error: userError } = await supabase
			.from('users')
			.select('*')
			.eq('id', user.id)
			.single();
		if (userError) console.error('User Fetch Error:', userError);
		if (!userData || userData.cargo_points < item.cost) {
			console.log('Error: Not enough points', userData?.cargo_points, item.cost);
			return fail(400, { error: 'Not enough cargo points' });
		}
		console.log('User has enough points. Current points:', userData.cargo_points);

		console.log('Updating user points...');
		const { error: updateError } = await supabase
			.from('users')
			.update({ cargo_points: userData.cargo_points - item.cost })
			.eq('id', user.id);

		if (updateError) {
			console.error('Point Update Error:', updateError);
			return fail(500, { error: 'Failed to update points' });
		}
		console.log('Points updated successfully');

		console.log('Inserting redemption record...');
		const { data: redemption, error: insertError } = await supabase
			.from('user_redemptions')
			.insert({
				user_id: user.id,
				item_id: item.id,
				status: 'pending'
			})
			.select()
			.single();

		if (insertError || !redemption) {
			console.error('Redemption Insertion Error:', insertError);
			return fail(500, { error: 'Failed to process redemption' });
		}
		console.log('Redemption recorded:', redemption.id);

		console.log('Attempting to send Slack notification...');
		const slackChannel = privateEnv.SLACK_SHOP_CHANNEL_ID || privateEnv.SLACK_REVIEW_CHANNEL_ID;
		console.log('Target Channel:', slackChannel);
		console.log('Token starts with:', privateEnv.SLACK_BOT_TOKEN?.substring(0, 5));

		if (privateEnv.SLACK_BOT_TOKEN && slackChannel) {
			const slackUserHandle = user.hackclub_id ? `<@${user.hackclub_id}>` : `*${user.name}*`;
			const slackMsg = `🚨 *New Shop Purchase!* 🚨\n${slackUserHandle} just bought *${item.name}*!`;

			try {
				const res = await fetch('https://slack.com/api/chat.postMessage', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${privateEnv.SLACK_BOT_TOKEN}`
					},
					body: JSON.stringify({
						channel: slackChannel,
						text: slackMsg,
						blocks: [
							{
								type: 'section',
								text: {
									type: 'mrkdwn',
									text: slackMsg
								}
							},
							{
								type: 'actions',
								elements: [
									{
										type: 'button',
										text: { type: 'plain_text', text: 'Mark Shipped 🚢', emoji: true },
										style: 'primary',
										value: redemption.id,
										action_id: `shop_shipped|${redemption.id}`
									},
									{
										type: 'button',
										text: { type: 'plain_text', text: 'Mark Delivered ✅', emoji: true },
										value: redemption.id,
										action_id: `shop_delivered|${redemption.id}`
									}
								]
							}
						]
					})
				});

				const slackResponse = await res.json();
				console.log('Slack API Response:', JSON.stringify(slackResponse, null, 2));

				if (!slackResponse.ok) {
					console.error('Slack API Error (Shop):', slackResponse.error);
				} else {
					console.log('Slack shop notification sent successfully:', slackResponse.ts);
				}
			} catch (e) {
				console.error('Failed to send Slack shop notification due to fetch error:', e);
			}
		} else {
			console.log('Skipping Slack notification: Missing token or channel ID');
		}

		return { success: true };
	}
};
