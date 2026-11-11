const colors = [[0, 0, 0], [34, 67, 110], [93, 49, 113], [124, 43, 81], [145, 70, 40], [35, 88, 75], [0, 0, 0]];
const cycle = 45000;

/** Refresh a tiny PNG: browsers commonly freeze animations inside SVG favicons. */
function animateFavicon() {
  const icon = document.querySelector('link[rel~="icon"]');
  if (!icon || typeof Path2D !== "function") return () => {};
  const original = { href:icon.getAttribute("href"), type:icon.getAttribute("type") };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let glyph, timer = 0, elapsed = 0, started = 0, renderedColor = "", disposed = false;
  const draw = () => {
    const position = ((elapsed + performance.now() - started) % cycle) / cycle * (colors.length - 1);
    const index = Math.floor(position), blend = (1 - Math.cos((position - index) * Math.PI)) / 2;
    const color = `rgb(${colors[index].map((channel, i) => Math.round(channel + (colors[index + 1][i] - channel) * blend)).join(",")})`;
    if (color === renderedColor) return;
    context.clearRect(0, 0, 64, 64);
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(0, 0, 64, 64, 14);
    context.fill();
    context.fillStyle = "#fff";
    context.fill(glyph);
    icon.type = "image/png";
    icon.href = canvas.toDataURL("image/png");
    renderedColor = color;
  };
  const pause = () => {
    if (!timer) return;
    elapsed += performance.now() - started;
    clearInterval(timer);
    timer = 0;
  };
  const restore = () => {
    icon.setAttribute("href", original.href);
    if (original.type) icon.setAttribute("type", original.type); else icon.removeAttribute("type");
    renderedColor = "";
  };
  const resume = () => {
    if (disposed || !glyph) return;
    if (motion.matches) { pause(); restore(); return; }
    if (document.hidden) { pause(); return; }
    if (timer) return;
    started = performance.now();
    draw();
    timer = setInterval(draw, 250);
  };
  document.addEventListener("visibilitychange", resume);
  motion.addEventListener("change", resume);
  window.addEventListener("pagehide", pause);
  window.addEventListener("pageshow", resume);
  // Reuse the outlined Bagel Fat One J, without another font or duplicate artwork.
  fetch(original.href).then(response => {
    if (!response.ok) throw new Error("Favicon unavailable");
    return response.text();
  }).then(source => {
    if (disposed) return;
    const path = new DOMParser().parseFromString(source, "image/svg+xml").querySelector("path[d]");
    if (!path) return;
    glyph = new Path2D(path.getAttribute("d"));
    resume();
  }).catch(() => {}); // The static SVG remains the fallback.
  return () => {
    disposed = true;
    pause();
    document.removeEventListener("visibilitychange", resume);
    motion.removeEventListener("change", resume);
    window.removeEventListener("pagehide", pause);
    window.removeEventListener("pageshow", resume);
    restore();
  };
}

const stop = animateFavicon();
if (import.meta.hot) import.meta.hot.dispose(stop);
