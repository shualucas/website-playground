import { useEffect, useState } from "react";

export function useListening() {
  const [listening, setListening] = useState({ track: null, recent: [], status: "loading", stale: false });
  useEffect(() => {
    let alive = true, current = null;
    const update = async () => {
      if (document.hidden || current) return;
      const controller = new AbortController(); current = controller;
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch("/api/listening", { signal: controller.signal, cache: "no-cache" });
        if (!response.ok) throw new Error("Unavailable");
        const data = response.status === 204 ? null : await response.json();
        if (alive) setListening({ track: data?.track?.title ? data.track : null, recent: Array.isArray(data?.recent) ? data.recent.slice(0, 5) : [], status: response.status === 204 ? "unconfigured" : "ready", stale: false });
      } catch {
        if (alive && !document.hidden) setListening(previous => ({ ...previous, status: "unavailable", stale: true }));
      } finally { clearTimeout(timeout); if (current === controller) current = null; }
    };
    const visibility = () => { if (document.hidden) current?.abort(); else void update(); };
    void update(); const timer = setInterval(update, 20000);
    document.addEventListener("visibilitychange", visibility);
    return () => { alive = false; current?.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return listening;
}
