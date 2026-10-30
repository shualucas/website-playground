/** Decorative, non-blocking duplicate: the anchor's native PDF download stays immediate. */
export class DownloadMotion {
  private copy: HTMLDivElement | null = null;
  private animation: Animation | null = null;
  private pulse: Animation | null = null;
  private pending = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");
  constructor(private sheet: HTMLElement, private button: HTMLAnchorElement) {
    this.motion.addEventListener("change", this.onMotion);
  }
  private onMotion = () => { if (this.motion.matches) this.clear(); };
  private clear() {
    this.pending++;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.animation?.cancel(); this.pulse?.cancel();
    this.animation = this.pulse = null;
    this.copy?.remove(); this.copy = null;
  }
  preload = () => {
    if (this.motion.matches) return;
    const image = new Image(); image.src = "/resume/resume-art-1200.png";
  };
  play = () => {
    this.clear();
    if (this.disposed || this.motion.matches) return;
    const token = this.pending;
    const existing = this.sheet.querySelector<HTMLImageElement>(".resume-artwork img");
    const image = new Image(); image.alt = ""; image.src = existing?.currentSrc || "/resume/resume-art-1200.png";
    // Slow/unavailable artwork skips the flourish, never the file download.
    this.timer = setTimeout(() => { if (this.pending === token) { this.pending++; this.timer = null; } }, 650);
    image.decode().then(() => {
      if (this.disposed || token !== this.pending || this.motion.matches) return;
      if (this.timer !== null) clearTimeout(this.timer); this.timer = null;
      this.fly(image);
    }).catch(() => { if (token === this.pending) { if (this.timer !== null) clearTimeout(this.timer); this.timer = null; } });
  };
  private fly(image: HTMLImageElement) {
    const source = this.sheet.getBoundingClientRect(), button = this.button.getBoundingClientRect();
    const icon = this.button.querySelector("svg")?.getBoundingClientRect() || button;
    const reading = this.sheet.dataset.mode === "read";
    const width = reading ? Math.min(142, innerWidth * .28) : source.width;
    const height = width * 842 / 595;
    const centerX = reading ? Math.max(width / 2 + 16, Math.min(innerWidth - width / 2 - 16, source.right - width / 2)) : source.left + width / 2;
    const centerY = reading ? Math.max(button.bottom + height / 2 + 20, Math.min(innerHeight - height / 2 - 20, innerHeight * .48)) : source.top + height / 2;
    const copy = document.createElement("div"); copy.className = "resume-download-copy";
    copy.setAttribute("aria-hidden", "true"); copy.inert = true;
    Object.assign(copy.style, { width:`${width}px`, height:`${height}px`, left:`${centerX-width/2}px`, top:`${centerY-height/2}px` });
    copy.append(image); document.body.append(copy); this.copy = copy;
    const dx = icon.left + icon.width / 2 - centerX, dy = icon.top + icon.height / 2 - centerY;
    const arc = Math.min(75, innerWidth * .08);
    const animation = copy.animate([
      { opacity:0, transform:"translate3d(0,0,0) rotate(-.5deg) scale(.98)", offset:0 },
      { opacity:.94, transform:"translate3d(8px,-12px,0) rotate(2deg) scale(.98)", offset:.12 },
      { opacity:.95, transform:`translate3d(${dx*.58+arc}px,${dy*.58-45}px,0) rotate(-11deg) scale(.28)`, offset:.58 },
      { opacity:0, transform:`translate3d(${dx}px,${dy}px,0) rotate(8deg) scale(${Math.min(22/width,.15)})`, offset:1 },
    ], { duration:820, easing:"cubic-bezier(.4,0,.2,1)", fill:"both" });
    this.animation = animation;
    this.pulse = this.button.querySelector("svg")?.animate([{transform:"translateY(0)"},{transform:"translateY(3px)",offset:.5},{transform:"translateY(0)"}],{duration:320,delay:650,easing:"ease-out"}) || null;
    animation.finished.then(() => { if (this.copy === copy) { copy.remove(); this.copy = null; this.animation = null; } }).catch(() => {});
  }
  dispose() { this.disposed = true; this.clear(); this.motion.removeEventListener("change", this.onMotion); }
}
