const PROFILE = "https://www.last.fm/user/";
const CACHE_MS = 20000;

const normalize = (track, user) => track?.name ? {
  title: track.name,
  artist: track.artist?.["#text"] || track.artist?.name || "Unknown artist",
  url: track.url?.startsWith("https://") ? track.url : PROFILE + encodeURIComponent(user),
  artwork: [...(track.image || [])].reverse().find(image => image["#text"]?.startsWith("https://"))?.["#text"] || "",
  playing: track["@attr"]?.nowplaying === "true",
  playedAt: track.date?.uts ? Number(track.date.uts) * 1000 : null,
} : null;

export function createListeningHandler({ user = "shualucas", apiKey = "", fetcher = fetch, clock = Date.now } = {}) {
  let cached = null, expires = 0, pending = null;
  return async function listening(req, res) {
    res.setHeader("Cache-Control", "public, max-age=20, s-maxage=20");
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); res.statusCode = 405; res.end(); return; }
    if (!apiKey || !user) {
      res.setHeader("Cache-Control", "no-store"); res.setHeader("Content-Type", "application/json"); res.statusCode = 503;
      res.end(JSON.stringify({ code: "LISTENING_NOT_CONFIGURED", error: "Listening is not configured on this deployment." })); return;
    }
    try {
      if (!expires || clock() >= expires) {
        pending ??= (async () => {
          // Include the current track plus at least five completed scrobbles.
          const query = new URLSearchParams({ method: "user.getrecenttracks", user, api_key: apiKey, format: "json", limit: "6" });
          const response = await fetcher(`https://ws.audioscrobbler.com/2.0/?${query}`, { signal: AbortSignal.timeout(5000) });
          if (!response.ok) throw new Error("Listening service unavailable");
          const result = await response.json(); if (result.error) throw new Error("Listening service unavailable");
          const raw = result.recenttracks?.track;
          const tracks = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(track => normalize(track, user)).filter(Boolean);
          cached = { track: tracks[0] || null, recent: tracks.filter(track => !track.playing).slice(0, 5) };
          expires = clock() + CACHE_MS;
        })().finally(() => { pending = null; });
        await pending;
      }
      res.setHeader("Content-Type", "application/json"); res.statusCode = 200; res.end(JSON.stringify(cached));
    } catch {
      res.setHeader("Cache-Control", "no-store"); res.setHeader("Content-Type", "application/json"); res.statusCode = 502;
      res.end(JSON.stringify({ error: "Listening history is temporarily unavailable." }));
    }
  };
}

export default createListeningHandler({ user: process.env.LASTFM_USER || "shualucas", apiKey: process.env.LASTFM_API_KEY });
