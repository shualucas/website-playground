const CACHE_MS = 15 * 60 * 1000;
const CONDITIONS = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow", 80: "Showers", 81: "Showers",
  82: "Heavy showers", 85: "Snow showers", 86: "Snow showers", 95: "Thunderstorms", 96: "Thunderstorms", 99: "Thunderstorms",
};
// A fixed city, with no visitor geolocation, API key or client configuration.
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles";

export function createWeatherHandler({ fetcher = fetch, clock = Date.now } = {}) {
  let cached = null, expires = 0, pending = null;
  return async function weather(req, res) {
    res.setHeader("Content-Type", "application/json");
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); res.statusCode = 405; res.end(); return; }
    try {
      if (!cached || clock() >= expires) {
        pending ??= (async () => {
          const response = await fetcher(WEATHER_URL, { signal: AbortSignal.timeout(5000) });
          if (!response.ok) throw new Error("Weather unavailable");
          const { current } = await response.json();
          if (!Number.isFinite(current?.temperature_2m) || !Number.isInteger(current?.weather_code)) throw new Error("Invalid weather");
          cached = { temperature: Math.round(current.temperature_2m), condition: CONDITIONS[current.weather_code] || "", city: "San Francisco" };
          expires = clock() + CACHE_MS;
        })().finally(() => { pending = null; });
        await pending;
      }
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=900");
      res.statusCode = 200; res.end(JSON.stringify(cached));
    } catch {
      res.setHeader("Cache-Control", "no-store"); res.statusCode = 502;
      res.end(JSON.stringify({ error: "Weather is temporarily unavailable." }));
    }
  };
}

export default createWeatherHandler();
