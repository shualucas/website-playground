const PROFILE = "https://www.last.fm/user/";

export function createListeningHandler({ user = "shualucas", apiKey = "", fetcher = fetch, clock = Date.now } = {}) {
  let cached = null, expires = 0, pending = null;
  return async function listening(req, res) {
    res.setHeader("Cache-Control", "public, max-age=20, s-maxage=20, stale-while-revalidate=40");
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); res.statusCode = 405; res.end(); return; }
    if (!apiKey || !user) { res.statusCode = 204; res.end(); return; }
    try {
      if (!expires || clock() >= expires) {
        pending ??= (async () => {
          const query = new URLSearchParams({ method: "user.getrecenttracks", user, api_key: apiKey, format: "json", limit: "1" });
          const response = await fetcher(`https://ws.audioscrobbler.com/2.0/?${query}`, { signal: AbortSignal.timeout(5000) });
          if (!response.ok) throw new Error("Listening service unavailable");
          const result = await response.json(); if (result.error) throw new Error("Listening service unavailable");
          const track = result.recenttracks?.track?.[0];
          cached = track ? { title: track.name, artist: track.artist?.["#text"] || "", url: track.url?.startsWith("https://") ? track.url : PROFILE + encodeURIComponent(user),
            artwork: [...(track.image || [])].reverse().find(image => image["#text"]?.startsWith("https://"))?.["#text"] || "",
            playing: track["@attr"]?.nowplaying === "true", playedAt: track.date?.uts ? Number(track.date.uts) * 1000 : null, source: "lastfm" } : null;
          expires = clock() + 20000;
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
