import { supabase } from '$lib/supabaseClient';
// Import from SvelteKit if available, otherwise use process.env for standalone scripts
const pat = process.env.PRIVATE_AIRTABLE_PAT;
const baseId = process.env.PRIVATE_AIRTABLE_BASE_ID;
const tableId = process.env.PRIVATE_AIRTABLE_PROJECTS_TABLE;

export async function syncProjectToAirtable(projectId: string) {
	if (!pat || !baseId || !tableId) {
		console.warn('Airtable sync skipped: Missing credentials in environment variables.');
		return;
	}

	try {
		// Fetch project, user details, and the latest dev log attachment
		const { data: project, error } = await supabase
			.from('projects')
			.select('*, users(*), posts(attachment)')
			.eq('id', projectId)
			.order('created_at', { foreignTable: 'posts', ascending: false })
			.limit(1, { foreignTable: 'posts' })
			.single();

		if (error || !project) {
			console.error('Failed to fetch project for Airtable sync:', error);
			return;
		}

		// Get the latest dev log attachment
		const latestPost = project.posts?.[0];
		const screenshotUrl = latestPost?.attachment || project.header_img || '';

		const address = project.users?.address || {};

		const nameParts = (project.users?.name || '').split(' ');
		const firstName = nameParts[0] || '';
		const lastName = nameParts.slice(1).join(' ') || '';

		const fields = {
			'Description': project.description,
			'Code URL': project.repo_url || '',
			'Playable URL': project.playable_url || '',
			'First Name': firstName,
			'Last Name': lastName,
			'Email': project.users?.email || '',
			'Birthday': project.users?.birthday || '',
			'GitHub Username': project.users?.name || '',
			'Address (Line 1)': address.line_1 || '',
			'Address (Line 2)': address.line_2 || '',
			'City': address.city || '',
			'State / Province': address.state || '',
			'ZIP / Postal Code': address.postal_code || '',
			'Country': address.country || '',
			'Screenshot': screenshotUrl ? [{ url: screenshotUrl }] : []
		};

		// 1. Check if record exists in Airtable using Code URL as the identifier
		const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}?filterByFormula=${encodeURIComponent(`{Code URL}='${project.repo_url}'`)}`;
		const searchRes = await fetch(searchUrl, {
			headers: {
				Authorization: `Bearer ${pat}`
			}
		});

		if (!searchRes.ok) {
			const text = await searchRes.text();
			console.error('Airtable search failed:', text);
			return;
		}

		const searchData = await searchRes.json();
		const existingRecord = searchData.records?.[0];

		if (existingRecord) {
			// 2. Update existing record
			const updateUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}/${existingRecord.id}`;
			const updateRes = await fetch(updateUrl, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${pat}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ fields })
			});

			if (!updateRes.ok) {
				const text = await updateRes.text();
				console.error('Airtable update failed:', text);
			} else {
				console.log(`Successfully updated project ${project.id} in Airtable.`);
			}
		} else {
			// 3. Create new record
			const createUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`;
			const createRes = await fetch(createUrl, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${pat}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ fields })
			});

			if (!createRes.ok) {
				const text = await createRes.text();
				console.error('Airtable creation failed:', text);
			} else {
				console.log(`Successfully created project ${project.id} in Airtable.`);
			}
		}
	} catch (e) {
		console.error('Airtable sync crash:', e);
	}
}
