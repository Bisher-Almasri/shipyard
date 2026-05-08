import { env as privateEnv } from '$env/dynamic/private';
import sharp from 'sharp';

export async function uploadImage(file: File): Promise<string> {
	let fileToUpload = file;

	// Compress image if it's larger than 500KB
	if (file.size > 500 * 1024) {
		try {
			const buffer = await file.arrayBuffer();
			const compressedBuffer = await sharp(buffer)
				.resize(1920, 1080, {
					fit: 'inside',
					withoutEnlargement: true
				})
				.webp({ quality: 80 })
				.toBuffer();

			// Create a new File object from the compressed buffer
			fileToUpload = new File([compressedBuffer], file.name.replace(/\.[^/.]+$/, '.webp'), {
				type: 'image/webp'
			});

			console.log(`Image compressed: ${file.size} bytes → ${compressedBuffer.length} bytes`);
		} catch (err) {
			console.warn('Failed to compress image, uploading original:', err);
			// Continue with original file if compression fails
		}
	}

	const formData = new FormData();
	formData.append('file', fileToUpload);

	const response = await fetch('https://cdn.hackclub.com/api/v4/upload', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${privateEnv.PRIVATE_HC_CDN_API_KEY}`
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
			Authorization: `Bearer ${privateEnv.PRIVATE_HC_CDN_API_KEY}`,
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
