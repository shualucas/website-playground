import { useEffect, useState } from "react";

export function useListening() {
  const [track, setTrack] = useState(null);
  useEffect(() => {
    let alive = true, current = null;
    const update = async () => {
      if (document.hidden || current) return;
      current = new AbortController();
      try {
        const response = await fetch("/api/listening", { signal: current.signal });
        if (!response.ok) throw new Error("Unavailable");
        const data = response.status === 204 ? null : await response.json();
        if (alive) setTrack(data?.title && data?.artist ? { ...data, stale: false } : null);
      } catch {
        if (alive) setTrack(previous => previous ? { ...previous, stale: true } : null);
      } finally { current = null; }
    };
    const visibility = () => { if (document.hidden) current?.abort(); else void update(); };
    void update(); const timer = setInterval(update, 60000);
    document.addEventListener("visibilitychange", visibility);
    return () => { alive = false; current?.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return track;
}
