import { test as base, expect } from "@playwright/test";
import { funFacts } from "../../src/cartridge/fun-facts.js";

export async function disableWebGL(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...args);
    };
  });
}

export const test = base.extend({
  webgl: [true, { option: true }],
  page: async ({ page, webgl }, use) => {
    if (!webgl) await disableWebGL(page);
    await use(page);
  },
  mockApis: [async ({ page }, use) => {
    await page.route("**/api/listening", route => route.fulfill({ status:204 }));
    await page.route("**/api/weather", route => route.fulfill({ contentType:"application/json", body:JSON.stringify({ temperature:58, condition:"Fog", city:"San Francisco" }) }));
    await use();
  }, { auto:true }],
});
export { expect, funFacts };

export const names = ["Search", "Stadia", "Gmail", "Blizzard Entertainment"];
export const dates = ["2022 – now", "2020 – 2022", "2019", "2017"];
export const body = "based in California, building stuff at Google.";
export async function load(page, path = "/") {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(path);
  await expect(page.locator(".collection")).toHaveAttribute("data-status", "ready", { timeout: 60000 });
  await expect(page.locator(".collection")).toHaveAttribute("data-presented", "true", { timeout: 60000 });
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-hit2", /"x"/, { timeout: 60000 });
}
export async function choose(page, name) {
  const control = page.getByRole("button", { name: `View ${name} cartridge`, exact: true });
  await control.focus(); await control.press("Enter");
  await expect(page.locator(".cartridge-stage")).toHaveAttribute("data-settled", "true", { timeout: 60000 });
}
export async function point(page, index) {
  const stage = page.locator(".cartridge-stage"), bounds = await stage.boundingBox();
  const position = JSON.parse(await stage.getAttribute(`data-hit${index}`));
  return { x: bounds.x + position.x, y: bounds.y + position.y };
}
