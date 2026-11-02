import { existsSync } from "node:fs";

// Keep loopback traffic local without changing the proxy for external services.
const bypass = [...new Set(`${process.env.NO_PROXY || ""},${process.env.no_proxy || ""},127.0.0.1,localhost`.split(",").filter(Boolean))].join(",");
process.env.NO_PROXY = process.env.no_proxy = bypass;

export const browserOptions = {
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    ...(process.env.BROWSER_RENDERER === "hardware" ? [] : ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"]),
  ],
};
