import { PRIVATE_HC_CDN_API_KEY } from '$env/static/private';

export async function uploadImage(file: File): Promise<string> {
	const formData = new FormData();
	formData.append('file', file);

	const response = await fetch('https://cdn.hackclub.com/api/v4/upload', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${PRIVATE_HC_CDN_API_KEY}`
		},
		body: formData
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to upload image to CDN');
	}

	const { url } = await response.json();
	return url;
}

export async function uploadFromUrl(url: string): Promise<string> {
	const response = await fetch('https://cdn.hackclub.com/api/v4/upload_from_url', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${PRIVATE_HC_CDN_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ url })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to upload image from URL to CDN');
	}

	const { url: uploadedUrl } = await response.json();
	return uploadedUrl;
}
