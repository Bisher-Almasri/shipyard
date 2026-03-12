import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: PageServerLoad = async () => {
	const { data: posts } = await supabase
		.from('posts')
		.select(
			`
            *,
            project:projects (
                id,
                title,
                header_img,
                user:users (
                    id,
                    name,
                    avatar
                )
            )
        `
		)
		.order('created_at', { ascending: false })
		.limit(20);

	return {
		posts: posts || []
	};
};
