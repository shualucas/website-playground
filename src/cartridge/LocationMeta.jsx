import React, { useEffect, useState } from "react";

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});

export function LocationMeta() {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    let timer;
    const tick = () => { setNow(new Date()); timer = setTimeout(tick, 60020 - Date.now() % 60000); };
    tick();
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    let active = true, request;
    const refresh = async () => {
      if (document.hidden) return;
      request?.abort(); const controller = new AbortController(); request = controller;
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch("/api/weather", { signal: controller.signal });
        if (!response.ok) throw new Error("Weather unavailable");
        const data = await response.json();
        if (active && request === controller && Number.isFinite(data.temperature)) setWeather(data);
      } catch { if (active && request === controller) setWeather(null); }
      finally { clearTimeout(timeout); }
    };
    void refresh();
    const timer = setInterval(refresh, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; clearInterval(timer); request?.abort(); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return <div className="location-meta" data-reveal aria-label="San Francisco local time and weather">
    <span>San Francisco</span>
    <time dateTime={now.toISOString()}>{timeFormat.format(now)}</time>
    {weather && <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" title="Weather data by Open-Meteo">{weather.temperature}°F{weather.condition ? ` · ${weather.condition}` : ""}</a>}
  </div>;
}
