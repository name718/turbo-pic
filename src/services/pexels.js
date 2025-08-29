// Minimal Pexels API client using fetch. Expects VITE_PEXELS_API_KEY in env.

const PEXELS_BASE = "https://api.pexels.com";

function getApiKey() {
	const apiKey = import.meta.env.VITE_PEXELS_API_KEY;
	if (!apiKey) {
		throw new Error("Missing VITE_PEXELS_API_KEY. Create a .env file based on .env.example.");
	}
	return apiKey;
}

async function requestJson(path, params = {}) {
	const url = new URL(path, PEXELS_BASE);
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			url.searchParams.set(key, String(value));
		}
	});

	const res = await fetch(url.toString(), {
		headers: {
			Authorization: getApiKey(),
		},
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Pexels API error ${res.status}: ${text}`);
	}
	return res.json();
}

export async function fetchCuratedPhotos(page = 1, perPage = 24) {
	return requestJson("/v1/curated", { page, per_page: perPage });
}

export async function searchPhotos(query, page = 1, perPage = 24) {
	return requestJson("/v1/search", { query, page, per_page: perPage, locale: "zh-CN" });
}

export async function fetchPopularVideos(page = 1, perPage = 12) {
	return requestJson("/videos/popular", { page, per_page: perPage });
}

export async function searchVideos(query, page = 1, perPage = 12) {
	return requestJson("/videos/search", { query, page, per_page: perPage, locale: "zh-CN" });
}

export function mapPhotoItems(apiResult) {
	const photos = apiResult?.photos || [];
	return photos.map((p) => ({
		id: p.id,
		width: p.width,
		height: p.height,
		alt: p.alt || "",
		photographer: p.photographer,
		url: p.url,
		thumbnail: p.src?.medium || p.src?.small || p.src?.tiny,
		full: p.src?.large2x || p.src?.large || p.src?.original,
		type: "photo",
	}));
}

export function mapVideoItems(apiResult) {
	const videos = apiResult?.videos || [];
	return videos
		.map((v) => {
			const mp4 = (v.video_files || []).find((f) => f.file_type === "video/mp4");
			const picture = v.image;
			return mp4
				? {
					id: v.id,
					width: v.width,
					height: v.height,
					duration: v.duration,
					thumbnail: picture,
					mp4: mp4.link,
					type: "video",
				}
				: null;
		})
		.filter(Boolean);
}


