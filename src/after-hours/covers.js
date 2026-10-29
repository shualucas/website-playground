import { flyers, flyerPage } from "./flyers";

const paper = "#f5f1e6", ink = "#4134bf", rust = "#85513e";

function canvas() {
  const element = document.createElement("canvas");
  element.width = flyerPage.width; element.height = flyerPage.height;
  return element;
}

function text(ctx, value, x, y, size = 26, font = "monospace", color = rust, weight = 400) {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}

function badge(ctx, x, y, width, height, lines, shape = "cut") {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = rust; ctx.lineWidth = 3;
  ctx.beginPath();
  if (shape === "oval") ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
  else if (shape === "cloud") {
    // An original four-lobed colophon, drawn as one continuous outline.
    const w = width / 2, h = height / 2;
    ctx.moveTo(-w, 0);
    ctx.bezierCurveTo(-w * 1.08, -h, -w * .3, -h * 1.4, 0, -h * .7);
    ctx.bezierCurveTo(w * .3, -h * 1.4, w * 1.08, -h, w, 0);
    ctx.bezierCurveTo(w * 1.08, h, w * .3, h * 1.4, 0, h * .7);
    ctx.bezierCurveTo(-w * .3, h * 1.4, -w * 1.08, h, -w, 0);
  } else {
    const w = width / 2, h = height / 2, cut = Math.min(16, height / 3);
    ctx.moveTo(-w + cut, -h); ctx.lineTo(w - cut, -h); ctx.lineTo(w, -h + cut);
    ctx.lineTo(w, h - cut); ctx.lineTo(w - cut, h); ctx.lineTo(-w + cut, h);
    ctx.lineTo(-w, h - cut); ctx.lineTo(-w, -h + cut); ctx.closePath();
  }
  ctx.stroke();
  lines.forEach((line, index) => text(ctx, line, 0, (index - (lines.length - 1) / 2) * 32, 28));
  ctx.restore();
}

function makePaper() {
  const base = canvas(), ctx = base.getContext("2d");
  ctx.fillStyle = paper; ctx.fillRect(0, 0, base.width, base.height);
  // A fixed print grain: never regenerated on animation frames.
  let seed = 7026;
  for (let i = 0; i < 24000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = seed % base.width;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    ctx.fillStyle = i % 2 ? "#85513e09" : "#ffffff50";
    ctx.fillRect(x, seed % base.height, 1, 1);
  }
  return base;
}

/** Two original print covers. Only the exposed front redraws, at most 12 fps. */
export async function prepareFlyerCovers() {
  await document.fonts.load('700 200px "DM Sans"');
  const front = canvas(), back = canvas(), base = makePaper();
  const lettering = canvas(), letters = lettering.getContext("2d");
  const frontContext = front.getContext("2d");
  let lastFrame = -1;

  function drawFront(time = 0, reduced = false) {
    const frame = reduced ? 0 : Math.floor(time * 12);
    if (frame === lastFrame) return false;
    lastFrame = frame;
    const ctx = frontContext;
    ctx.drawImage(base, 0, 0);
    badge(ctx, 555, 144, 350, 112, ["Collected & designed", "by Josh Lucas"], "oval");
    badge(ctx, 555, 302, 110, 49, ["San"]);
    badge(ctx, 555, 358, 230, 49, ["Francisco"]);

    letters.clearRect(0, 0, lettering.width, lettering.height);
    // A calm, readable hold followed by a short rolling, sliced-type passage.
    const cycle = (frame / 12) % 5.6;
    const activity = reduced || cycle < 2.8 ? 0 : Math.sin((cycle - 2.8) / 2.8 * Math.PI) ** 2;
    const rows = [{ value: "RAVE", y: 507, size: 235 }, { value: "FLYERS", y: 727, size: 211 }];
    for (const { value, y, size } of rows) {
      letters.save();
      letters.translate(555, y);
      letters.font = `700 ${size}px "DM Sans", sans-serif`;
      const scale = 915 / letters.measureText(value).width;
      letters.scale(scale, 1);
      letters.fillStyle = ink; letters.textAlign = "center"; letters.textBaseline = "middle";
      letters.fillText(value, 0, 0);
      letters.restore();
    }
    for (let y = 385; y < 843; y += 7) {
      const offset = Math.sin(y * .085 + cycle * 3.5) * activity * 20;
      ctx.drawImage(lettering, 0, y, lettering.width, 7, offset, y, lettering.width, 7);
      if (activity > .15 && Math.floor(y / 7) % 3 === 0) {
        ctx.fillStyle = paper; ctx.globalAlpha = activity * .8;
        ctx.fillRect(80, y + 5, 950, 2); ctx.globalAlpha = 1;
      }
    }
    badge(ctx, 555, 945, 290, 118, ["An after-hours", "collection"], "cloud");
    ctx.save(); ctx.translate(58, 632); ctx.rotate(-Math.PI / 2);
    text(ctx, "MUSIC / COMMUNITY / PRINT", 0, 0, 20); ctx.restore();
    ctx.save(); ctx.translate(1052, 632); ctx.rotate(Math.PI / 2);
    text(ctx, "FIVE ORIGINAL FLYERS", 0, 0, 20); ctx.restore();
    badge(ctx, 174, 1117, 125, 83, ["Vol.", "01"]);
    for (const [index, value] of [..."2026"].entries()) {
      const x = 894 + (index % 2) * 48, y = 1096 + Math.floor(index / 2) * 48;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.strokeStyle = rust;
      ctx.strokeRect(-17, -17, 34, 34); ctx.restore(); text(ctx, value, x, y, 20);
    }
    front.dataset.frame = String(frame);
    return true;
  }
  drawFront();

  const ctx = back.getContext("2d");
  ctx.drawImage(base, 0, 0);
  badge(ctx, 555, 150, 300, 100, ["The other side", "of the day"], "oval");
  text(ctx, "AFTER", 555, 388, 177, '"DM Sans", sans-serif', ink, 700);
  text(ctx, "HOURS", 555, 558, 177, '"DM Sans", sans-serif', ink, 700);
  ctx.strokeStyle = rust; ctx.lineWidth = 2.5;
  flyers.forEach((flyer, index) => {
    const y = 740 + index * 62;
    ctx.beginPath(); ctx.moveTo(170, y + 30); ctx.lineTo(940, y + 30); ctx.stroke();
    ctx.textAlign = "left"; ctx.fillStyle = rust; ctx.font = "24px monospace";
    ctx.fillText(`${String(index + 1).padStart(2, "0")}   ${flyer.title}`, 170, y);
  });
  badge(ctx, 555, 1155, 340, 65, ["Josh Lucas / 2026"]);

  return { front, back, update: (time, isBack, reduced) => !isBack && drawFront(time, reduced) };
}
