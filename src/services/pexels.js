// Minimal Pexels API client using fetch. Expects VITE_PEXELS_API_KEY in env.

const PEXELS_BASE = "https://api.pexels.com";

function getApiKey() {
	return import.meta.env.VITE_PEXELS_API_KEY || "";
}

async function requestJson(path, params = {}) {
	const url = new URL(path, PEXELS_BASE);
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			url.searchParams.set(key, String(value));
		}
	});

	const apiKey = getApiKey();
	if (!apiKey) {
		throw new Error("Missing VITE_PEXELS_API_KEY");
	}

	const res = await fetch(url.toString(), {
		headers: { Authorization: apiKey },
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Pexels API error ${res.status}: ${text}`);
	}
	return res.json();
}

export async function fetchCuratedPhotos(page = 1, perPage = 24) {
	try {
		return await requestJson("/v1/curated", { page, per_page: perPage });
	} catch (e) {
		return buildDemoPhotos(perPage);
	}
}

export async function searchPhotos(query, page = 1, perPage = 24) {
	try {
		return await requestJson("/v1/search", { query, page, per_page: perPage, locale: "zh-CN" });
	} catch (e) {
		return buildDemoPhotos(perPage, query);
	}
}

export async function fetchPopularVideos(page = 1, perPage = 12) {
	try {
		return await requestJson("/videos/popular", { page, per_page: perPage });
	} catch (e) {
		return buildDemoVideos(perPage);
	}
}

export async function searchVideos(query, page = 1, perPage = 12) {
	try {
		return await requestJson("/videos/search", { query, page, per_page: perPage, locale: "zh-CN" });
	} catch (e) {
		return buildDemoVideos(perPage, query);
	}
}

export function mapPhotoItems(apiResult) {
	const photos = apiResult?.photos || [];
	return photos.map((p) => {
		const src = p.src || {};
		const display = src.large2x || src.large || src.medium || src.small || src.tiny;
		const srcset = [
			src.tiny ? `${src.tiny} 160w` : null,
			src.small ? `${src.small} 400w` : null,
			src.medium ? `${src.medium} 640w` : null,
			src.large ? `${src.large} 940w` : null,
			src.large2x ? `${src.large2x} 1880w` : null,
		]
			.filter(Boolean)
			.join(', ');
		return {
			id: p.id,
			width: p.width,
			height: p.height,
			alt: p.alt || "",
			photographer: p.photographer,
			photographerUrl: p.photographer_url,
			url: p.url,
			thumbnail: src.small || src.tiny || display,
			display,
			full: src.original || src.large2x || src.large || display,
			avgColor: p.avg_color || '#0f1117',
			srcset,
			type: "photo",
		};
	});
}

export function mapVideoItems(apiResult) {
	const videos = apiResult?.videos || [];
	return videos
		.map((v) => {
			const mp4 = (v.video_files || []).find((f) => f.file_type === "video/mp4");
			const picture = v.image;
			const authorName = v.user?.name || '';
			return mp4
				? {
					id: v.id,
					width: v.width,
					height: v.height,
					duration: v.duration,
					thumbnail: picture,
					mp4: mp4.link,
					author: authorName,
					url: v.url || '',
					type: "video",
				}
				: null;
		})
		.filter(Boolean);
}

// Demo data builders (no network / no API key)
function buildDemoPhotos(perPage = 24, query = '') {
	const demo = { photos: [] };
	for (let i = 0; i < perPage; i++) {
		const id = 1000 + i;
		const w = 800 + ((i % 4) * 60);
		const h = 600 + ((i % 3) * 40);
		const url = `https://picsum.photos/id/${(i % 100) + 1}/${w}/${h}`;
		demo.photos.push({
			id,
			width: w,
			height: h,
			alt: query ? `${query} demo` : 'demo photo',
			photographer: 'Demo',
			url,
			src: { tiny: url, small: url, medium: url, large: url, large2x: url, original: url },
		});
	}
	return demo;
}

function buildDemoVideos(perPage = 12, query = '') {
	const demo = { videos: [] };
	const samples = [
		{
			id: 1,
			width: 1280,
			height: 720,
			duration: 6,
			image: 'https://picsum.photos/seed/video1/1280/720',
			video_files: [{ file_type: 'video/mp4', link: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4' }],
		},
		{
			id: 2,
			width: 1280,
			height: 720,
			duration: 6,
			image: 'https://picsum.photos/seed/video2/1280/720',
			video_files: [{ file_type: 'video/mp4', link: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4' }],
		},
	];
	for (let i = 0; i < Math.min(perPage, samples.length); i++) {
		demo.videos.push(samples[i]);
	}
	return demo;
}


