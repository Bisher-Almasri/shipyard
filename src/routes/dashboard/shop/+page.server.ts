import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: PageServerLoad = async () => {
	const { data: shopItems } = await supabase
		.from('shop_items')
		.select('*')
		.order('cost', { ascending: true });

	return {
		shopItems: shopItems || []
	};
};
