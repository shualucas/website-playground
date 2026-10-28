/** Original local paper foley, played only from actual leaf starts after a user gesture. */
export class PageTurnSound {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private loading: Promise<ArrayBuffer> | null = null;
  private decoding: Promise<void> | null = null;
  private voices = new Set<AudioBufferSourceNode>();
  private disposed = false;
  muted = false;
  played = 0;
  preload() {
    this.loading ??= fetch("/audio/page-turn.wav").then((r) => {
      if (!r.ok) throw new Error("Paper audio unavailable");
      return r.arrayBuffer();
    });
    this.loading.catch(() => {});
  }
  async unlock() {
    if (this.disposed) return;
    const Context =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Context) return;
    this.context ??= new Context();
    this.preload();
    try {
      await this.context.resume();
      this.decoding ??= this.loading!.then(async (bytes) => {
        if (!this.disposed)
          this.buffer = await this.context!.decodeAudioData(bytes.slice(0));
      });
      await this.decoding;
    } catch {
      /* A silent reading experience remains usable if audio is unavailable. */
    }
  }
  async turn(forward = true, cover = false) {
    if (this.disposed || this.muted || !this.context || document.hidden) return;
    await this.unlock();
    if (
      this.disposed ||
      this.muted ||
      !this.buffer ||
      this.context.state !== "running" ||
      document.hidden
    )
      return;
    if (this.voices.size >= 3) {
      const oldest = this.voices.values().next().value;
      oldest?.stop();
      if (oldest) this.voices.delete(oldest);
    }
    const source = this.context.createBufferSource(),
      gain = this.context.createGain();
    source.buffer = this.buffer;
    source.playbackRate.value =
      (cover ? 0.91 : 1) +
      (forward ? 0.015 : -0.015) +
      ((this.played % 3) - 1) * 0.035;
    gain.gain.value = (cover ? 0.6 : 0.5) / Math.sqrt(this.voices.size + 1);
    source.connect(gain);
    gain.connect(this.context.destination);
    this.voices.add(source);
    this.played++;
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.voices.forEach((v) => v.stop());
  }
  dispose() {
    this.disposed = true;
    this.voices.forEach((v) => v.stop());
    this.voices.clear();
    void this.context?.close();
  }
}
