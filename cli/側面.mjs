// 命令列用的側面掃描：開一個無頭瀏覽器，把網頁轉到側面看一次。
// 安全：外來網站的東西一律不載入（只看不跑），免得掃描本身被打。
// 需要：npm install（會裝 playwright-core）＋一個 Chrome。Chrome 位置可用環境變數 CHROME_PATH 指定。
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { 掃描頁面 } from "../core/側面掃描.mjs";
import { 例外們, 機器字最短, 判側面 } from "../core/側面法典.mjs";

const 型別 = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };

export function 找Chrome() {
  const 候選 = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"];
  return 候選.find((p) => p && existsSync(p)) || null;
}

// 把資料夾當網站開起來（只准讀資料夾裡面的檔案）
function 開資料夾(資料夾) {
  const 根 = path.resolve(資料夾);
  const 伺服器 = createServer(async (req, res) => {
    try {
      let 檔 = path.resolve(根, "." + decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!檔.startsWith(根)) { res.writeHead(403).end(); return; }
      if ((await stat(檔)).isDirectory()) 檔 = path.join(檔, "index.html");
      res.writeHead(200, { "content-type": 型別[path.extname(檔)] || "application/octet-stream" }).end(await readFile(檔));
    } catch { res.writeHead(404).end(); }
  });
  return new Promise((ok) => 伺服器.listen(0, "127.0.0.1", () => ok({ 伺服器, 網址: `http://127.0.0.1:${伺服器.address().port}/` })));
}

export async function 側面掃描(目標, { 例外選擇器 = 例外們.map((e) => e.選) } = {}) {
  let chromium;
  try { ({ chromium } = await import("playwright-core")); }
  catch { throw new Error("要先 npm install（側面掃描需要 playwright-core）"); }
  const 執行檔 = 找Chrome();
  if (!執行檔) throw new Error("找不到 Chrome，請用環境變數 CHROME_PATH 指定");
  const 是網址 = /^https?:\/\//.test(目標);
  const 站 = 是網址 ? null : await 開資料夾(目標);
  const 網址 = 是網址 ? 目標 : 站.網址;
  const 瀏覽器 = await chromium.launch({ executablePath: 執行檔, args: ["--no-sandbox"] });
  try {
    const 頁 = await 瀏覽器.newPage({ viewport: { width: 390, height: 844 } });
    const 家 = new URL(網址).origin;
    await 頁.route("**/*", (r) => (new URL(r.request().url()).origin === 家 ? r.continue() : r.abort()));
    await 頁.goto(網址, { waitUntil: "load", timeout: 30000 });
    await 頁.waitForTimeout(500);
    const 發現們 = await 頁.evaluate(掃描頁面, { 例外選擇器, 機器字最短 });
    return { 網址: 是網址 ? 網址 : 目標, ...判側面(發現們) };
  } finally {
    await 瀏覽器.close();
    站?.伺服器.close();
  }
}
