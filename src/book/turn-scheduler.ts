import { SkinnedLeaf } from "./leaf";

/** Input intent, launched turns and the settled spread are deliberately separate. */
export class TurnScheduler {
  requested = 0;
  launched = 0;
  committed = 0;
  private untilLaunch = 0;
  maxConcurrent = 0;
  private turns = new Set<number>();
  constructor(
    readonly leaves: SkinnedLeaf[],
    private onTurn: (forward: boolean, cover: boolean) => void = () => {},
  ) {}
  get moving() {
    return this.launched !== this.requested || this.turns.size > 0;
  }
  get active() {
    let count = 0;
    for (const leaf of this.leaves) if (this.turns.has(leaf.id)) count++;
    return count;
  }
  request(boundary: number) {
    this.requested = Math.max(0, Math.min(this.leaves.length, boundary));
  }
  relative(direction: number) {
    this.request(this.requested + direction);
  }
  snap(boundary: number, notify = false) {
    this.request(boundary);
    this.launched = this.committed = this.requested;
    this.untilLaunch = 0;
    this.turns.clear();
    this.leaves.forEach((leaf, i) => {
      const target = i < this.requested ? 1 : 0;
      if (notify && leaf.target !== target) this.onTurn(!!target, leaf.cover);
      leaf.snap(target);
    });
  }
  step(dt: number, flex: number, intro = false) {
    this.untilLaunch = Math.max(0, this.untilLaunch - dt);
    if (this.launched !== this.requested && this.untilLaunch <= 0) {
      const forward = this.requested > this.launched,
        leaf = this.leaves[forward ? this.launched : this.launched - 1];
      // Retarget a moving leaf immediately; it does not consume another active slot.
      if (this.active < Math.min(5, this.leaves.length) || !leaf.settled) {
        if (leaf.target !== Number(forward)) this.onTurn(forward, leaf.cover);
        leaf.turnTo(forward);
        this.turns.add(leaf.id);
        this.launched += forward ? 1 : -1;
        const distance = Math.abs(this.requested - this.launched);
        // Launch the final cover in the same riffle; never wait for a settled spread.
        this.untilLaunch = intro ? 0.13 : distance > 1 ? 0.085 : 0.12;
      }
    }
    let changed = false;
    const catchUp = intro
      ? 1.4
      : Math.abs(this.requested - this.committed) > 1
        ? 1.12
        : 1;
    for (const leaf of this.leaves)
      changed = leaf.step(dt, flex, catchUp) || changed;
    for (let i = this.leaves.length - 2; i >= 0; i--)
      this.leaves[i].keepAheadOf(this.leaves[i + 1]);
    for (const leaf of this.leaves) {
      if (leaf.turning) this.turns.add(leaf.id);
      if (leaf.settled) this.turns.delete(leaf.id);
    }
    this.maxConcurrent = Math.max(this.maxConcurrent, this.active);
    if (!this.moving) this.committed = this.requested;
    return changed;
  }
}
