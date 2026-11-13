import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { browserOptions } from "./browser-config.mjs";

const { values: args } = parseArgs({ options: {
  page:{ type:"string", default:"home" }, path:{ type:"string" },
  width:{ type:"string", default:"1440" }, height:{ type:"string", default:"1000" },
  theme:{ type:"string", default:"light" }, motion:{ type:"string", default:"normal" },
  hover:{ type:"string" }, control:{ type:"string" }, cartridge:{ type:"string" }, phase:{ type:"string", default:"settled" },
  output:{ type:"string" }, port:{ type:"string", default:"3000" }, help:{ type:"boolean" },
} });
const paths = { home:"/", resume:"/resume/", zine:"/after-hours/", photos:"/photos/", archive:"/zine/" };
if (args.help) {
  console.log("npm run review -- --page home|resume|zine|photos|archive [--hover PROJECT_ID] [--control SELECTOR] [--cartridge 'Stadia'] [--phase settled|dither|turn] [--theme light|dark] [--motion normal|reduce] [--width 1440 --height 1000] [--output test-results/review/image.png] [--path '/?project=ai-mode-nudges&view=case-study'] [--port 3000]");
  process.exit(0);
}
if (!paths[args.page] || !["light", "dark"].includes(args.theme) || !["normal", "reduce"].includes(args.motion) || !["settled", "dither", "turn"].includes(args.phase)) throw new Error("Invalid option; use --help.");
if (args.phase !== "settled" && args.motion === "reduce") throw new Error("Mid-animation captures require --motion normal.");
if (args.phase === "dither" && !args.hover || args.phase === "turn" && args.page !== "zine") throw new Error("dither requires --hover; a turn capture requires --page zine.");
const width = Number(args.width), height = Number(args.height), port = Number(args.port);
if (![width, height, port].every(n => Number.isInteger(n) && n > 0) || port > 65535) throw new Error("Use positive integer dimensions and a valid port.");
const baseURL = `http://127.0.0.1:${port}`;
const output = resolve(args.output || `test-results/review/${args.page}-${args.theme}-${args.phase}.png`);

async function ensureServer() {
  const documentIsOurs = async () => {
    const response = await fetch(baseURL, { signal:AbortSignal.timeout(1000) });
    const html = await response.text();
    if (!response.ok || !html.includes('/@vite/client') || !html.includes('/src/cartridge/main.jsx')) throw new Error(`Port ${port} serves a different app or a production build; use another --port.`);
  };
  try { await documentIsOurs(); return async () => {}; }
  catch (error) { if (!error.cause && error.name !== "TimeoutError") throw error; }
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd:process.cwd(), stdio:["ignore", "pipe", "pipe"] });
  let log = "", failure;
  server.on("error", error => { failure = error; });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", chunk => { log = (log + chunk).slice(-2000); });
  const stop = async () => {
    if (server.exitCode !== null) return;
    const exited = new Promise(done => server.once("exit", done));
    server.kill("SIGTERM"); await Promise.race([exited, delay(2000)]);
  };
  try {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (failure || server.exitCode !== null) throw failure || new Error(log);
      try { await documentIsOurs(); return stop; } catch (error) { if (!error.cause && error.name !== "TimeoutError") throw error; }
      await delay(150);
    }
    throw new Error(`Vite did not become ready. ${log}`);
  } catch (error) { await stop(); throw error; }
}

const stopServer = await ensureServer();
let browser;
try {
  browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({ viewport:{ width, height }, reducedMotion:args.motion === "reduce" ? "reduce" : "no-preference" });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/listening", route => route.fulfill({ status:204 }));
  await page.route("**/api/weather", route => route.fulfill({ status:204 }));
  await page.addInitScript(({ theme, phase }) => {
    localStorage.setItem("cartridge-color-mode", theme); localStorage.setItem("zine-color-mode", theme);
    window.__review = { armed:false, frozen:false, held:[], phase };
    const raf = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(now => {
      const state = window.__review;
      if (state.armed) {
        const dither = document.querySelector('.recent-preview-dither[data-state="revealing"]');
        const book = document.querySelector(".after-hours-book"), progress = Number(book?.dataset.turnProgress);
        if (state.phase === "dither" && dither && Number(dither.style.opacity) > .7 || state.phase === "turn" && book?.dataset.phase === "turning" && progress > .35 && progress < .75) state.frozen = true;
      }
      // Freeze only the target animation, leaving Playwright/other RAFs alive.
      const target = state.phase === "dither" ? "paint" : "frame";
      if (state.frozen && callback.name === target) { state.held.push(callback); return; }
      callback(now);
    });
  }, { theme:args.theme, phase:args.phase });
  await page.goto(new URL(args.path || paths[args.page], baseURL).href, { waitUntil:"domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  const wait = { timeout:60000 };
  if (args.page === "home" && !args.path?.includes("view=case-study")) {
    await expect(page.locator(".collection")).toHaveAttribute("data-status", /ready|fallback/, wait);
    if (await page.locator(".cartridge-stage").count() && await page.locator(".collection").getAttribute("data-status") === "ready") await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-interactive", "true", wait);
  } else if (args.page === "zine") {
    await expect(page.locator(".after-hours")).toHaveAttribute("data-ready", "true", wait);
    if (await page.locator(".after-hours-book").isVisible()) await expect(page.locator(".after-hours-book")).toHaveAttribute("data-phase", "ready", wait);
  } else if (args.page === "resume") {
    if (await page.locator(".resume-floating-frame").getAttribute("aria-hidden") === "false") {
      await expect(page.locator(".resume-sheet")).toHaveAttribute("data-art-ready", "true", wait);
      await expect(page.locator(".resume-sheet")).toHaveAttribute("data-surface", /webgl|fallback/, wait);
    } else await expect(page.locator(".resume-read-sheet")).toBeVisible(wait);
  } else if (args.page === "photos") await expect(page.locator(".photos-page")).toHaveAttribute("data-ready", "true", wait);
  else if (args.page === "archive") {
    await expect(page.locator(".spellbook")).toHaveAttribute("data-presentation", "ready", wait);
    await expect(page.locator(".book-stage")).toHaveAttribute("data-phase", "ready", wait);
  }
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll("[data-reveal],[data-reveal-gate]")].every(el => {
    const rect = el.getBoundingClientRect();
    const blocker = el.closest('[inert]');
    return !rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || !!el.closest('[aria-hidden="true"]') || blocker && blocker.dataset.revealInert !== "true" || el.dataset.revealReady === "true";
  })), wait).toBe(true);
  if (args.cartridge) {
    const control = page.getByRole("button", { name:`View ${args.cartridge} cartridge`, exact:true });
    await control.focus(); await control.press("Enter");
    await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-settled", "true", wait);
  }
  if (args.phase !== "settled") await page.evaluate(() => { window.__review.armed = true; });
  if (args.hover) {
    const row = page.locator(`[data-project="${args.hover}"] .recent-project-link`);
    await row.hover();
    const kind = await page.locator(".recent-preview-content").getAttribute("data-kind");
    const dither = kind === "zine" || kind === "film";
    if (args.phase === "dither" && !dither) throw new Error("dither captures are available only for the zine and film previews.");
    if (args.phase === "settled") {
      if(args.motion!=="reduce")await expect(page.locator('.thumbnail-dither')).toHaveAttribute('data-filled','true',wait);
      if (dither) await expect(page.locator(".recent-preview-dither")).toHaveAttribute("data-state", "complete", wait);
      if (kind === "zine") await expect(page.locator(".zine-preview-scene")).toHaveAttribute("data-preview-intro", "settled", wait);
      if (kind === "film") await expect(page.locator(".film-camera-dock")).toHaveAttribute("data-intro", "settled", wait);
      if (!dither) await page.locator('.recent-solid-visual').evaluate(async element => { await Promise.allSettled(element.getAnimations().map(animation => animation.finished)); });
    }
  }
  if (args.phase === "turn") {
    // Open the cover first; its phase is "opening", not an interior "turning".
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".after-hours-book")).toHaveAttribute("data-phase", "ready", wait);
    await expect(page.locator(".after-hours-book")).toHaveAttribute("data-view", "spread", wait);
    await page.keyboard.press("ArrowRight");
  }
  if (args.phase !== "settled") await expect.poll(() => page.evaluate(() => window.__review.frozen), wait).toBe(true);
  else await page.evaluate(async () => { const root = document.querySelector(".collection"); if (root) await Promise.allSettled(root.getAnimations().map(animation => animation.finished)); });
  if(args.control){
    const control=page.locator(args.control);await control.hover();
    if(args.motion!=="reduce")await expect(control.locator('.control-dither')).toHaveAttribute('data-filled','true',wait);
  }
  await mkdir(dirname(output), { recursive:true }); await page.screenshot({ path:output });
  console.log(`Saved ${output}`);
  if (errors.length) throw new Error(errors.join("\n"));
} finally { await browser?.close(); await stopServer(); }
