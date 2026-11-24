// 命令列用的側面掃描：開一個無頭瀏覽器，把網頁轉到側面看一次。
// 安全（2026-11-23 ChatGPT 第四輪後改寫，原本「只看不跑」說過頭了）：
//   外來網站的東西一律不載入；本站的程式預設會跑（才看得到用程式長出來的東西），但只准讀（GET/HEAD），
//   任何寫入請求都擋下並列在「擋下們」。要完全不跑程式，用「不跑程式」模式。
//   本機資料夾當網站時，只准讀資料夾「裡面」的檔案：照真實位置（解開捷徑連結）比資料夾邊界，不比字串開頭。
// 需要：npm install（會裝 playwright-core）＋一個 Chrome。Chrome 位置可用環境變數 CHROME_PATH 指定。
import { createServer } from "node:http";
import { readFile, stat, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { 掃描頁面 } from "../core/側面掃描.mjs";
import { 例外們, 例外條件們, 機器字最短, 判側面, 掃描範圍, 子文件上限, 掃描模式們, 像指令, 像編碼, 原始碼位置們 } from "../core/側面法典.mjs";

const 型別 = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };

export function 找Chrome() {
  const 候選 = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"];
  return 候選.find((p) => p && existsSync(p)) || null;
}

// 把資料夾當網站開起來（只准讀資料夾裡面的檔案）
// 原本用「字串開頭一樣」判斷：/站 和 /站-祕密 開頭一樣，編碼過的 ../ 就讀到隔壁資料夾（ChatGPT 第四輪實測）。
// 現在：先解開捷徑連結拿到真實位置，再看它跟資料夾的相對路徑有沒有往外走。
export async function 在裡面(根真, 檔) {
  let 真; try { 真 = await realpath(檔); } catch { return false; }
  const 相對 = path.relative(根真, 真);
  return 相對 === "" || (!相對.startsWith("..") && !path.isAbsolute(相對));
}
export async function 開資料夾(資料夾) {
  const 根真 = await realpath(path.resolve(資料夾));
  const 伺服器 = createServer(async (req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405).end(); return; }
      let 檔 = path.resolve(根真, "." + decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!(await 在裡面(根真, 檔))) { res.writeHead(403).end(); return; }
      if ((await stat(檔)).isDirectory()) { 檔 = path.join(檔, "index.html"); if (!(await 在裡面(根真, 檔))) { res.writeHead(403).end(); return; } }
      res.writeHead(200, { "content-type": 型別[path.extname(檔)] || "application/octet-stream" }).end(await readFile(檔));
    } catch { res.writeHead(404).end(); }
  });
  return new Promise((ok) => 伺服器.listen(0, "127.0.0.1", () => ok({ 伺服器, 網址: `http://127.0.0.1:${伺服器.address().port}/` })));
}

export async function 側面掃描(目標, { 例外選擇器 = 例外們.map((e) => e.選), 例外條件 = 例外條件們.map((x) => x.名), 範圍 = 掃描範圍.map((x) => x.處), 模式 = "跑程式", 打開關閉影子 = true } = {}) {
  if (!掃描模式們.includes(模式)) throw new Error("掃描模式只能是：" + 掃描模式們.join("、"));
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
    const 頁 = await 瀏覽器.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: 模式 === "跑程式" });
    // 關起來的影子元件，外面拿不到；在網頁程式跑之前，把「關起來」改成「打開」，掃描器才鑽得進去（Meta AI 第五輪）
    // （只在跑程式模式有用；不跑程式時用寫在網頁裡的關閉影子元件，目前看不到，老實列在工單）
    if (打開關閉影子) await 頁.addInitScript(() => {
      const 原 = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (選項) { return 原.call(this, { ...選項, mode: "open" }); };
    });
    const 家 = new URL(網址).origin, 擋下們 = [];
    await 頁.route("**/*", (r) => {
      const q = r.request(), u = new URL(q.url());
      if (u.protocol === "data:" || u.protocol === "blob:") return r.continue();
      const 原因 = u.origin !== 家 ? "外來網站" : !["GET", "HEAD"].includes(q.method()) ? "寫入請求" : null;
      if (!原因) return r.continue();
      擋下們.push({ 原因, 方法: q.method(), 網址: u.href });
      return r.abort();
    });
    // 等網路安靜下來再掃（2026-11-24）：只等「載入完成」的話，晚一點才畫出來的字會時有時無，結果不穩，也讓晚出現的藏字躲過去
    await 頁.goto(網址, { waitUntil: "load", timeout: 30000 });
    await 頁.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await 頁.waitForTimeout(500);
    // 不跑程式時，evaluate 仍可執行（那是掃描器自己，不是網頁的程式）
    const { 發現們, 掃過 } = await 頁.evaluate(掃描頁面, { 範圍, 例外選擇器, 例外條件, 機器字最短, 子文件上限, 像指令源: 像指令.source, 像編碼源: 像編碼.source, 原始碼位置們 });
    const 沒掃到 = 範圍.filter((x) => !掃過.includes(x) && !["影子元件", "子文件", "遮擋"].includes(x));   // 頁面沒有影子元件、內嵌框、像指令的字時本來就不會進去
    if (沒掃到.length) throw new Error("掃描器沒照表做完：" + 沒掃到.join("、"));
    return { 網址: 是網址 ? 網址 : 目標, 模式, 掃過, 擋下們, ...判側面(發現們) };
  } finally {
    await 瀏覽器.close();
    站?.伺服器.close();
  }
}
