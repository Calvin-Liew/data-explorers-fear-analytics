import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "docs", "screenshots");

const targets = [
  {
    name: "Scene 1 - Blood Flow of Horror",
    selector: "#viz-sankey",
    ready: "#viz-sankey svg",
    file: "01-sankey-signals.png",
  },
  {
    name: "Scene 2 - Heartbeat of Terror",
    selector: "#viz-fear-build",
    ready: "#viz-fear-build svg",
    file: "02-fear-journey.png",
  },
  {
    name: "Scene 3 - Mapping the Spikes",
    selector: "#viz-spikes",
    ready: "#viz-spikes svg",
    file: "03-spikes.png",
  },
  {
    name: "Scene 4 - Ladder of Fear",
    selector: "#viz-state-machine",
    ready: "#viz-state-machine svg",
    file: "04-state-machine.png",
  },
  {
    name: "Scene 5 - Signal Effectiveness",
    selector: "#viz-effectiveness",
    ready: "#viz-effectiveness svg",
    file: "05-effectiveness.png",
  },
  {
    name: "Scene 6 - Impact Dripline",
    selector: "#viz-drip",
    ready: "#viz-drip svg",
    file: "06-dripline.png",
  },
  {
    name: "Scene 7 - Ratings vs Impact",
    selector: "#viz-rating-impact",
    ready: "#viz-rating-impact svg",
    file: "07-rating-impact.png",
  },
  {
    name: "Scene 8 - Horror Fingerprint",
    selector: "#viz-radar",
    ready: "#viz-radar svg",
    file: "08-radar.png",
  },
  {
    name: "Final Act - Film Dossiers",
    selector: "#viz-movie-gallery",
    ready: "#viz-movie-gallery .movie-poster-card",
    file: "09-movie-gallery.png",
  },
];

async function findPort(start = 4173) {
  for (let port = start; port < start + 50; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error("No free local port found for screenshot server.");
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling until the Python server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const port = await findPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn("python", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
    cwd: repoRoot,
    stdio: "ignore",
    windowsHide: true,
  });

  let browser;
  try {
    await waitForServer(baseUrl);

    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 1,
    });

    page.setDefaultTimeout(45000);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({
      content: `
        * {
          scroll-behavior: auto !important;
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
        #heartbeat-container { display: none !important; }
      `,
    });

    await page.waitForFunction(() => window.fearAnalyticsState?.data);

    for (const target of targets) {
      await page.waitForSelector(target.ready);
      const locator = page.locator(target.selector).first();
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(750);
      const filePath = path.join(outputDir, target.file);
      await locator.screenshot({ path: filePath, animations: "disabled" });
      console.log(`Captured ${target.name}: ${path.relative(repoRoot, filePath)}`);
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
