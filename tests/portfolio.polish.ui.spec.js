import { test, expect } from "./support/portfolio.js";

test.use({ webgl: false });

test("listening artwork stays square and only the history arrow brightens on hover", async ({ page }) => {
  await page.emulateMedia({ reducedMotion:"reduce" });
  const track = { title:"Fixture track", artist:"Fixture artist", url:"https://www.last.fm/music/fixture", artwork:"/cartridges/labels/search-tonal.svg", playing:true };
  await page.route("**/api/listening", route => route.fulfill({ contentType:"application/json", body:JSON.stringify({ track, recent:[{ ...track, playing:false }, { ...track, title:"No artwork", artwork:null, playing:false }] }) }));
  await page.goto("/");
  const widget = page.locator(".listening-widget"), toggle = widget.getByRole("button", { name:"Show last five songs" });
  await expect(widget.locator(".now-playing")).toHaveAttribute("data-track", "Fixture track");
  for (const dark of [false, true]) {
    if (dark) await page.getByRole("button", { name:"Switch to dark mode" }).click();
    await page.mouse.move(2, 2);
    const idle = await toggle.locator("svg").evaluate(el => getComputedStyle(el).color);
    await toggle.hover();
    await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect.poll(() => toggle.locator("svg").evaluate(el => getComputedStyle(el).color)).not.toBe(idle);
    await toggle.click();
    const history = widget.getByRole("region", { name:"Recently listened" });
    await expect(history).toBeVisible();
    expect(await widget.locator(".listening-artwork img,.listening-artwork svg").evaluateAll(nodes => nodes.length >= 3 && nodes.every(el => getComputedStyle(el).borderRadius === "0px"))).toBe(true);
    await expect(history.locator("svg rect")).not.toHaveAttribute("rx", /.+/);
    await page.keyboard.press("Escape");
  }
});
