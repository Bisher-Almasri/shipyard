import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export interface HackatimeTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
	created_at: number;
}

export interface HackatimeUser {
	id: number;
	emails: string[];
	slack_id: string;
	github_username: string;
	trust_factor: {
		trust_level: string;
		trust_value: number;
	};
}

export interface HackatimeHours {
	start_date: string;
	end_date: string;
	total_seconds: number;
}

export interface HackatimeStreak {
	streak_days: number;
}

export interface HackatimeProject {
	name: string;
	total_seconds: number;
	most_recent_heartbeat: string;
	languages: string[];
	archived: boolean;
}

const BASE_URL = 'https://hackatime.hackclub.com';

export async function exchangeCodeForToken(code: string, redirectUri: string) {
	const params = new URLSearchParams({
		client_id: publicEnv.PUBLIC_HACKATIME_CLIENT_UID,
		client_secret: privateEnv.PRIVATE_HACKATIME_CLIENT_SECRET,
		code,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code'
	});

	const res = await fetch(`${BASE_URL}/oauth/token`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: params.toString()
	});

	if (!res.ok) {
		throw new Error(`Failed to exchange code for token: ${await res.text()}`);
	}

	return (await res.json()) as HackatimeTokenResponse;
}

export async function getHackatimeUser(accessToken: string) {
	const res = await fetch(`${BASE_URL}/api/v1/authenticated/me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch user data: ${await res.text()}`);
	}

	return (await res.json()) as HackatimeUser;
}

export async function getHackatimeHours(accessToken: string, startDate?: string, endDate?: string) {
	const params = new URLSearchParams();
	if (startDate) params.append('start_date', startDate);
	if (endDate) params.append('end_date', endDate);

	const res = await fetch(`${BASE_URL}/api/v1/authenticated/hours?${params.toString()}`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch hours: ${await res.text()}`);
	}

	return (await res.json()) as HackatimeHours;
}

export async function getHackatimeStreak(accessToken: string) {
	const res = await fetch(`${BASE_URL}/api/v1/authenticated/streak`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch streak: ${await res.text()}`);
	}

	return (await res.json()) as HackatimeStreak;
}

export async function getHackatimeProjects(accessToken: string, includeArchived = false) {
	const params = new URLSearchParams({
		include_archived: includeArchived.toString()
	});

	const res = await fetch(`${BASE_URL}/api/v1/authenticated/projects?${params.toString()}`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch projects: ${await res.text()}`);
	}

	const data = (await res.json()) as { projects: HackatimeProject[] };
	return data.projects;
}
