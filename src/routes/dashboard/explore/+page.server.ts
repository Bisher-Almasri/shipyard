import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	const { data: posts } = await supabase
		.from('posts')
		.select(
			`
            *,
            comments (
                *,
                users (
                    name,
                    avatar
                )
            ),
            post_likes (
                user_id
            ),
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
		user,
		posts: posts || []
	};
};

export const actions: Actions = {
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
	}
};
